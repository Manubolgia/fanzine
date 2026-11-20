// Photo import (resized copies kept in IndexedDB), image caches and the zine filters.
'use strict';
Z.photos = (() => {
  const SIZES = { full: 3000, prev: 1000, thumb: 260 };
  const bitmaps = new Map(); // key photoId:kind -> Promise<ImageBitmap>
  const processed = new Map(); // key -> canvas | ImageBitmap
  const pending = new Set();
  const lru = (map, max) => {
    while (map.size > max) map.delete(map.keys().next().value);
  };
  // processed images are evicted by total pixels, since a 300 dpi page holds big ones
  const pxOf = new Map();
  const PX_BUDGET = 70e6;
  const trimProcessed = () => {
    let total = 0;
    for (const k of processed.keys()) total += pxOf.get(k) || 0;
    while (total > PX_BUDGET && processed.size > 1) {
      const k = processed.keys().next().value;
      total -= pxOf.get(k) || 0;
      processed.delete(k);
      pxOf.delete(k);
    }
  };
  const touch = (map, k) => {
    const v = map.get(k);
    map.delete(k);
    map.set(k, v);
    return v;
  };

  // --- EXIF date (JPEG only); falls back to the file's own date.
  const exifDate = async (file) => {
    try {
      const buf = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
      if (buf.getUint16(0) !== 0xffd8) return null;
      let off = 2;
      while (off < buf.byteLength - 4) {
        const marker = buf.getUint16(off);
        const len = buf.getUint16(off + 2);
        if (marker === 0xffe1 && buf.getUint32(off + 4) === 0x45786966) {
          const t = off + 10;
          const le = buf.getUint16(t) === 0x4949;
          const u16 = (o) => buf.getUint16(t + o, le);
          const u32 = (o) => buf.getUint32(t + o, le);
          const readIfd = (o) => {
            const out = {};
            const n = u16(o);
            for (let i = 0; i < n; i++) {
              const e = o + 2 + i * 12;
              out[u16(e)] = { type: u16(e + 2), count: u32(e + 4), val: u32(e + 8) };
            }
            return out;
          };
          const str = (ent) => {
            let s = '';
            for (let i = 0; i < ent.count - 1; i++) s += String.fromCharCode(buf.getUint8(t + ent.val + i));
            return s;
          };
          const ifd0 = readIfd(u32(4));
          let ds = null;
          if (ifd0[0x8769]) {
            const ex = readIfd(ifd0[0x8769].val);
            if (ex[0x9003]) ds = str(ex[0x9003]);
          }
          if (!ds && ifd0[0x0132]) ds = str(ifd0[0x0132]);
          const m = ds && ds.match(/^(\d{4}):(\d\d):(\d\d)/);
          return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
        }
        if ((marker & 0xff00) !== 0xff00) break;
        off += 2 + len;
      }
    } catch (e) {}
    return null;
  };

  // Downscale in steps (full -> preview -> thumbnail); each step reuses the previous, smaller image.
  const resize = async (src, max, q) => {
    const s = Math.min(1, max / Math.max(src.width, src.height));
    const w = Math.max(1, Math.round(src.width * s)), h = Math.max(1, Math.round(src.height * s));
    const bmp = s < 1 ? await createImageBitmap(src, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' }) : src;
    const c = Z.canvas(w, h);
    c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    if (bmp !== src) bmp.close();
    const blob = Z.canvasJpeg(c, q);
    return { blob, canvas: c };
  };

  const MONTH_NAMES = [
    ['january', 'enero', 'jan', 'ene'], ['february', 'febrero', 'feb'], ['march', 'marzo', 'mar'], ['april', 'abril', 'apr', 'abr'],
    ['may', 'mayo'], ['june', 'junio', 'jun'], ['july', 'julio', 'jul'], ['august', 'agosto', 'aug', 'ago'],
    ['september', 'septiembre', 'setiembre', 'sep', 'sept'], ['october', 'octubre', 'oct'], ['november', 'noviembre', 'nov'], ['december', 'diciembre', 'dec', 'dic'],
  ];
  const chapterForMonth = (p, m) => {
    const chapters = p.sections.filter((s) => s.type === 'chapter');
    const byName = chapters.find((s) => MONTH_NAMES[m].includes(s.name.trim().toLowerCase()));
    if (byName) return byName;
    return chapters.length === 12 ? chapters[m] : null;
  };

  return {
    version: 0,
    SIZES,
    chapterForMonth,
    // Returns {added: [photo], failed: [name]}.
    async importFiles(p, files, sectionId, byDate, onProgress) {
      const added = [];
      const failed = [];
      let next = 0, done = 0;
      const one = async (file) => {
        let bmp;
        try {
          bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(file));
        } catch (e) {
          failed.push(file.name);
          return;
        }
        const id = Z.uid();
        const date = (await exifDate(file)) || (file.lastModified ? new Date(file.lastModified) : null);
        const full = await resize(bmp, SIZES.full, 0.93);
        const rec = { id, name: file.name, w: bmp.width, h: bmp.height, sectionId, date: date ? date.toISOString() : null };
        bmp.close();
        const prev = await resize(full.canvas, SIZES.prev, 0.88);
        const thumb = await resize(prev.canvas, SIZES.thumb, 0.8);
        full.canvas.width = 1;
        if (byDate && date) {
          const ch = chapterForMonth(p, date.getMonth());
          if (ch) rec.sectionId = ch.id;
        }
        await Z.store.putBlob(id + ':full', full.blob);
        await Z.store.putBlob(id + ':prev', prev.blob);
        await Z.store.putBlob(id + ':thumb', thumb.blob);
        rec.order = files.indexOf(file);
        added.push(rec);
      };
      const worker = async () => {
        while (next < files.length) {
          const file = files[next++];
          await one(file);
          done++;
          if (onProgress) onProgress(done, files.length, file.name);
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      added.sort((a, b) => a.order - b.order).forEach((r) => delete r.order);
      return { added, failed };
    },

    bitmap(photoId, kind) {
      const k = photoId + ':' + kind;
      if (bitmaps.has(k)) return touch(bitmaps, k);
      const pr = Z.store.getBlob(k).then((b) => (b ? createImageBitmap(b) : null));
      bitmaps.set(k, pr);
      lru(bitmaps, 60);
      if (kind === 'full') for (const k of [...bitmaps.keys()]) if (k.endsWith(':full') && k !== photoId + ':full' && [...bitmaps.keys()].filter((x) => x.endsWith(':full')).length > 3) bitmaps.delete(k);
      return pr;
    },

    thumbURL: (() => {
      const urls = new Map();
      const get = async (photoId) => {
        if (urls.has(photoId)) return urls.get(photoId);
        const b = await Z.store.getBlob(photoId + ':thumb');
        const u = b ? URL.createObjectURL(b) : '';
        urls.set(photoId, u);
        return u;
      };
      get.forgetMissing = () => { for (const [k, u] of urls) if (!u) urls.delete(k); };
      return get;
    })(),

    // Photo files can arrive later (from sync): drop the remembered "not here" answers.
    async forgetMissing() {
      await Promise.all([...bitmaps].map(async ([k, pr]) => { if (!(await pr.catch(() => null)) && bitmaps.get(k) === pr) bitmaps.delete(k); }));
      this.thumbURL.forgetMissing();
    },

    keyFor(el, needPx) {
      const f = el.filter || Z.defaultFilter();
      const rec = Z.findPhoto(Z.state.project, el.photoId);
      const kind = rec && needPx > Math.max(rec.w, rec.h) * Math.min(1, SIZES.prev / Math.max(rec.w, rec.h)) * 1.05 ? 'full' : 'prev';
      const bucket = Math.ceil(needPx / 160) * 160;
      const fk = [f.mode, f.brightness, f.contrast, f.saturation, f.warmth, f.fade, f.grain, f.mode === 'halftone' || f.mode === 'duotone' || f.mode === 'photocopy' ? f.ink : '', f.mode === 'halftone' ? f.dot : ''].join(',');
      return { key: `${el.photoId}|${kind}|${fk}|${bucket}`, kind, bucket, f };
    },

    // Synchronous for the screen: returns the image if ready, otherwise starts work and
    // asks for a redraw when it lands.
    get(el, needPx, dwMm) {
      const { key } = this.keyFor(el, needPx);
      if (processed.has(key)) return touch(processed, key);
      if (!pending.has(key)) {
        pending.add(key);
        this.ensure(el, needPx, dwMm).then(() => {
          pending.delete(key);
          Z.requestRender && Z.requestRender();
        });
      }
      return null;
    },

    async ensure(el, needPx, dwMm) {
      const { key, kind, bucket, f } = this.keyFor(el, needPx);
      if (processed.has(key)) return touch(processed, key);
      const src = await this.bitmap(el.photoId, kind);
      if (!src) return null;
      const out = process(src, f, bucket, dwMm, el.photoId);
      processed.set(key, out);
      pxOf.set(key, out.width * out.height);
      trimProcessed();
      this.version++;
      return out;
    },
    forget(photoId) {
      for (const k of [...bitmaps.keys()]) if (k.startsWith(photoId)) bitmaps.delete(k);
      for (const k of [...processed.keys()]) if (k.startsWith(photoId)) processed.delete(k);
    },
  };

  function isPlain(f) {
    return f.mode === 'color' && !f.brightness && !f.contrast && !f.saturation && !f.warmth && !f.fade && !f.grain;
  }
  function hex(c) {
    const n = parseInt(c.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function process(src, f, needPx, dwMm, seed) {
    const scale = Math.min(1, needPx / src.width);
    if (isPlain(f) && scale >= 0.999) return src;
    const c = Z.canvas(src.width * scale, src.height * scale);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, c.width, c.height);
    if (isPlain(f)) return c;
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    const rnd = Z.rng(seed + f.mode);
    const cf = (259 * (f.contrast * 1.28 + 255)) / (255 * (259 - f.contrast * 1.28));
    const sat = 1 + f.saturation / 100;
    const br = f.brightness * 1.2;
    const wm = f.warmth * 0.35;
    const fade = f.fade / 100;
    const grain = f.grain * 0.9;
    const ink = hex(f.ink || '#1f3a5f');
    const mode = f.mode;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      r += br + wm; g += br; b += br - wm;
      r = cf * (r - 128) + 128; g = cf * (g - 128) + 128; b = cf * (b - 128) + 128;
      let y = 0.299 * r + 0.587 * g + 0.114 * b;
      if (sat !== 1) { r = y + (r - y) * sat; g = y + (g - y) * sat; b = y + (b - y) * sat; }
      if (mode === 'bw') r = g = b = y;
      else if (mode === 'sepia') {
        const rr = 0.393 * r + 0.769 * g + 0.189 * b, gg = 0.349 * r + 0.686 * g + 0.168 * b, bb = 0.272 * r + 0.534 * g + 0.131 * b;
        r = rr; g = gg; b = bb;
      } else if (mode === 'photocopy') {
        let v = (y - 128) * 2.4 + 128 + (rnd() - 0.5) * 70;
        v = v < 105 ? 0 : v > 165 ? 1 : (v - 105) / 60;
        if (rnd() < 0.004) v = 0; // toner specks
        r = ink[0] + (246 - ink[0]) * v; g = ink[1] + (244 - ink[1]) * v; b = ink[2] + (238 - ink[2]) * v;
      } else if (mode === 'duotone') {
        const v = Z.clamp(y / 255, 0, 1);
        r = ink[0] + (250 - ink[0]) * v; g = ink[1] + (247 - ink[1]) * v; b = ink[2] + (240 - ink[2]) * v;
      } else if (mode === 'halftone') r = g = b = y;
      if (fade) {
        const lo = 40 * fade, hi = 255 - 22 * fade;
        r = lo + (r / 255) * (hi - lo); g = lo + (g / 255) * (hi - lo); b = lo + (b / 255) * (hi - lo);
        const yy = (r + g + b) / 3; r += (yy - r) * fade * 0.3; g += (yy - g) * fade * 0.3; b += (yy - b) * fade * 0.3;
      }
      if (grain) { const n = (rnd() + rnd() - 1) * grain; r += n; g += n; b += n; }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    ctx.putImageData(img, 0, 0);
    if (mode === 'halftone') return halftone(c, f, c.width / dwMm, ink);
    return c;
  }

  // Ink dots on a 45° grid, sized by darkness, like a risograph or newspaper print.
  function halftone(c, f, mmToPx, ink) {
    const cell = Math.max(3, f.dot * mmToPx);
    const W = c.width, H = c.height;
    const sw = Math.max(1, Math.ceil(W / cell * 2)), sh = Math.max(1, Math.ceil(H / cell * 2));
    const small = Z.canvas(sw, sh);
    const sctx = small.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(c, 0, 0, sw, sh);
    const sd = sctx.getImageData(0, 0, sw, sh).data;
    const out = Z.canvas(W, H);
    const o = out.getContext('2d');
    o.fillStyle = '#fbf9f4';
    o.fillRect(0, 0, W, H);
    o.fillStyle = `rgb(${ink[0]},${ink[1]},${ink[2]})`;
    const a = Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
    const R = Math.hypot(W, H);
    for (let u = -R; u < R; u += cell) {
      for (let v = -R; v < R; v += cell) {
        const x = W / 2 + u * ca - v * sa, y = H / 2 + u * sa + v * ca;
        if (x < -cell || y < -cell || x > W + cell || y > H + cell) continue;
        const sx = Z.clamp(Math.floor((x / W) * sw), 0, sw - 1), sy = Z.clamp(Math.floor((y / H) * sh), 0, sh - 1);
        const dark = 1 - sd[(sy * sw + sx) * 4] / 255;
        const r = cell * 0.62 * Math.sqrt(dark);
        if (r < 0.3) continue;
        o.beginPath();
        o.arc(x, y, r, 0, Math.PI * 2);
        o.fill();
      }
    }
    return out;
  }
})();
