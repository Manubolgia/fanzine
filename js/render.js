// One renderer for the screen and the PDF, so what you see is what prints.
// Everything is drawn in mm; `ppm` is device pixels per mm.
'use strict';
(() => {
  const measureCtx = Z.canvas(8, 8).getContext('2d');
  const REF = 100; // text is measured at 100px and scaled, so line breaks never depend on zoom

  Z.corners = (el, dx = 0) => {
    const cx = el.x + el.w / 2 + dx, cy = el.y + el.h / 2;
    const a = Z.rad(el.rot || 0), c = Math.cos(a), s = Math.sin(a);
    const extra = el.type === 'photo' && el.caption && el.style !== 'polaroid' ? el.capSize * Z.PT_TO_MM * 1.6 + 2 : 0;
    return [[-el.w / 2, -el.h / 2], [el.w / 2, -el.h / 2], [el.w / 2, el.h / 2 + extra], [-el.w / 2, el.h / 2 + extra]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
  };
  Z.aabb = (el, dx = 0) => {
    const pts = Z.corners(el, dx);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
  };

  // --- text layout (mm)
  const fontCss = (el, sizePx, family) => `${el.italic ? 'italic ' : ''}${el.bold ? '700 ' : '400 '}${sizePx}px ${Z.fontStack(family || el.font)}`;
  const display = (el) => (el.upper ? el.text.toUpperCase() : el.text);

  Z.layoutText = (el) => {
    const sizeMm = el.size * Z.PT_TO_MM;
    if (el.style === 'ransom') return layoutRansom(el, sizeMm);
    measureCtx.font = fontCss(el, REF);
    const k = sizeMm / REF;
    const sp = (el.spacing / 100) * sizeMm;
    const width = (str) => measureCtx.measureText(str).width * k + sp * Math.max(0, [...str].length);
    const lines = [];
    for (const para of display(el).split('\n')) {
      const words = para.split(/(\s+)/);
      let line = '';
      for (const w of words) {
        const test = line + w;
        if (line && width(test.trimEnd()) > el.w && w.trim()) {
          lines.push(line.trimEnd());
          line = w.trimStart();
        } else line = test;
      }
      lines.push(line.trimEnd());
    }
    const lh = sizeMm * el.lh;
    const pad = el.bg ? sizeMm * 0.25 : 0;
    return { lines: lines.map((t) => ({ t, w: width(t) })), lh, sizeMm, sp, h: lines.length * lh + pad * 2 + sizeMm * 0.1, pad };
  };

  function layoutRansom(el, sizeMm) {
    const rnd = (i, j) => Z.rng(el.id + ':' + i + ':' + j)();
    const chars = [...display(el)];
    const boxes = [];
    let x = 0, line = 0;
    const lineH = sizeMm * 1.35 * el.lh;
    const words = [];
    let cur = [];
    chars.forEach((ch, i) => {
      if (ch === '\n' || ch === ' ') { if (cur.length) words.push(cur); cur = []; words.push(ch === '\n' ? 'NL' : 'SP'); }
      else {
        const font = Z.RANSOM_FONTS[Math.floor(rnd(i, 1) * Z.RANSOM_FONTS.length)];
        const sc = 0.85 + rnd(i, 2) * 0.35;
        measureCtx.font = `400 ${REF}px ${Z.fontStack(font)}`;
        const cw = measureCtx.measureText(ch).width * (sizeMm * sc) / REF;
        cur.push({ ch, font, sc, w: cw + sizeMm * 0.28, i });
      }
    });
    if (cur.length) words.push(cur);
    const rows = [[]];
    for (const w of words) {
      if (w === 'NL') { rows.push([]); x = 0; continue; }
      if (w === 'SP') { x += sizeMm * 0.35; rows[rows.length - 1].push({ space: sizeMm * 0.35 }); continue; }
      const ww = w.reduce((a, b) => a + b.w, 0);
      if (x > 0 && x + ww > el.w) { rows.push([]); x = 0; }
      rows[rows.length - 1].push(...w);
      x += ww;
    }
    rows.forEach((r, li) => {
      while (r.length && r[r.length - 1].space) r.pop();
      const total = r.reduce((a, b) => a + (b.space || b.w), 0);
      let cx = el.align === 'center' ? (el.w - total) / 2 : el.align === 'right' ? el.w - total : 0;
      for (const b of r) {
        if (b.space) { cx += b.space; continue; }
        boxes.push({ ...b, x: cx, y: li * lineH, h: lineH * 0.92, li });
        cx += b.w;
      }
    });
    return { ransom: boxes, h: rows.length * lineH + sizeMm * 0.2, sizeMm };
  }

  const RANSOM_PAPERS = [['#ffffff', '#111111'], ['#111111', '#ffffff'], ['#f2c14e', '#111111'], ['#c8553d', '#ffffff'], ['#e9e5dc', '#1f3a5f'], ['#f4a6b7', '#111111'], ['#fbf6ea', '#c8553d'], ['#7fb3d5', '#111111']];

  const lineX = (el, ln) => (el.align === 'center' ? (el.w - ln.w) / 2 : el.align === 'right' ? el.w - ln.w : 0);
  const lineTop = (lay, i) => lay.pad + i * lay.lh + (lay.lh - lay.sizeMm) / 2;

  function drawText(ctx, el, o) {
    ctx.save();
    ctx.translate(-el.w / 2, -el.h / 2);
    if (Z.stretched(el)) drawStretched(ctx, el, o);
    else paintText(ctx, el, Z.layoutText(el), o.ppm);
    ctx.restore();
  }

  // Paints laid-out text with the block's top-left at the origin (mm). `only` limits it to one line.
  function paintText(ctx, el, lay, ppm, only) {
    ctx.save();
    ctx.scale(1 / ppm, 1 / ppm); // draw text in device pixels
    if (lay.ransom) {
      lay.ransom.forEach((b) => {
        if (only != null && b.li !== only) return;
        const r = Z.rng(el.id + ':' + b.i + ':3');
        const pair = RANSOM_PAPERS[Math.floor(r() * RANSOM_PAPERS.length)];
        ctx.save();
        ctx.translate((b.x + b.w / 2) * ppm, (b.y + b.h / 2) * ppm);
        ctx.rotate(Z.rad((r() - 0.5) * 12));
        ctx.fillStyle = pair[0];
        ctx.shadowColor = 'rgba(0,0,0,0.18)';
        ctx.shadowBlur = 0.6 * ppm;
        ctx.shadowOffsetY = 0.25 * ppm;
        ctx.fillRect((-b.w / 2) * ppm, (-b.h / 2) * ppm, b.w * ppm, b.h * ppm);
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = pair[1];
        ctx.font = `400 ${lay.sizeMm * b.sc * ppm}px ${Z.fontStack(b.font)}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.ch, 0, lay.sizeMm * 0.04 * ppm);
        ctx.restore();
      });
      ctx.restore();
      return;
    }
    const sizePx = lay.sizeMm * ppm;
    ctx.font = fontCss(el, sizePx);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const asc = lay.sizeMm * 0.8;
    lay.lines.forEach((ln, i) => {
      if (only != null && i !== only) return;
      const x = lineX(el, ln);
      const yTop = lineTop(lay, i);
      if (el.bg && ln.t) {
        ctx.fillStyle = el.bg;
        const p = lay.sizeMm * 0.22;
        ctx.fillRect((x - p) * ppm, (yTop - p * 0.6) * ppm, (ln.w + 2 * p) * ppm, (lay.sizeMm + p * 1.2) * ppm);
      }
      const y = (yTop + asc) * ppm;
      const drawStr = (str, px) => {
        if (el.outline) {
          ctx.lineJoin = 'round';
          ctx.lineWidth = sizePx * 0.08;
          ctx.strokeStyle = el.outline;
          ctx.strokeText(str, px, y);
        }
        ctx.fillStyle = el.color;
        ctx.fillText(str, px, y);
      };
      if (!lay.sp) drawStr(ln.t, x * ppm);
      else {
        let cx = x * ppm;
        const k = sizePx / REF;
        for (const ch of ln.t) {
          drawStr(ch, cx);
          measureCtx.font = fontCss(el, REF);
          cx += measureCtx.measureText(ch).width * k + lay.sp * ppm;
        }
      }
    });
    ctx.restore();
  }

  // --- stretched text: el.fit 'stretch' scales the letters (unevenly if need be) so their ink
  // fills the box edge to edge; 'lines' does that per line, stacked. The box size is the user's,
  // so el.h is not re-measured. Lines wrap at el.wrap (the width when stretching was turned on),
  // or only at line breaks. el.warp then bends the filled box into a shape.
  Z.stretched = (el) => el.type === 'text' && !!el.fit;

  // the text laid out unscaled, and the ink box of each non-empty line in that layout (mm)
  function stretchLayout(el) {
    let bw = el.wrap;
    if (!bw) {
      const l0 = Z.layoutText({ ...el, w: 1e5, align: 'left' });
      bw = (l0.ransom ? Math.max(0, ...l0.ransom.map((b) => b.x + b.w)) : Math.max(0, ...l0.lines.map((ln) => ln.w))) + 0.01;
    }
    const tel = { ...el, w: bw };
    const lay = Z.layoutText(tel);
    const rows = [];
    if (lay.ransom) {
      for (const b of lay.ransom) {
        // letters are tilted up to 6 degrees, so their corners reach a little further
        const hx = b.w / 2 + b.h * 0.06, hy = b.h / 2 + b.w * 0.06, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
        const r = rows[b.li] || (rows[b.li] = { li: b.li, x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity });
        r.x1 = Math.min(r.x1, cx - hx); r.x2 = Math.max(r.x2, cx + hx);
        r.y1 = Math.min(r.y1, cy - hy); r.y2 = Math.max(r.y2, cy + hy);
      }
    } else {
      measureCtx.font = fontCss(el, REF);
      const k = lay.sizeMm / REF;
      const e = el.outline ? lay.sizeMm * 0.04 : 0;
      lay.lines.forEach((ln, i) => {
        if (!ln.t.trim()) return;
        const m = measureCtx.measureText(ln.t);
        let l = -m.actualBoundingBoxLeft * k, r = m.actualBoundingBoxRight * k;
        if (lay.sp) {
          // drawn one letter at a time, as in paintText
          l = Infinity; r = -Infinity;
          let cx = 0;
          for (const ch of ln.t) {
            const c = measureCtx.measureText(ch);
            if (ch.trim()) { l = Math.min(l, cx - c.actualBoundingBoxLeft * k); r = Math.max(r, cx + c.actualBoundingBoxRight * k); }
            cx += c.width * k + lay.sp;
          }
        }
        const x = lineX(tel, ln), yTop = lineTop(lay, i), base = yTop + lay.sizeMm * 0.8;
        const row = { li: i, x1: x + l - e, x2: x + r + e, y1: base - m.actualBoundingBoxAscent * k - e, y2: base + m.actualBoundingBoxDescent * k + e };
        if (el.bg) {
          const p = lay.sizeMm * 0.22;
          row.x1 = Math.min(row.x1, x - p); row.x2 = Math.max(row.x2, x + ln.w + p);
          row.y1 = Math.min(row.y1, yTop - p * 0.6); row.y2 = Math.max(row.y2, yTop + lay.sizeMm + p * 0.6);
        }
        rows.push(row);
      });
    }
    return { tel, lay, rows: rows.filter((r) => r && r.x2 > r.x1 && r.y2 > r.y1) };
  }

  // the stretched text, unbent, filling the box (origin at the box's top-left, mm)
  function paintFilled(ctx, el, s, ppm) {
    const put = (b, x, y, w, h, only) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(w / (b.x2 - b.x1), h / (b.y2 - b.y1));
      ctx.translate(-b.x1, -b.y1);
      paintText(ctx, s.tel, s.lay, ppm, only);
      ctx.restore();
    };
    if (el.fit === 'lines') {
      const n = s.rows.length, gap = n > 1 ? (el.h / n) * 0.07 : 0, rh = (el.h - gap * (n - 1)) / n;
      s.rows.forEach((r, i) => put(r, 0, i * (rh + gap), el.w, rh, r.li));
    } else {
      const b = { x1: Math.min(...s.rows.map((r) => r.x1)), x2: Math.max(...s.rows.map((r) => r.x2)), y1: Math.min(...s.rows.map((r) => r.y1)), y2: Math.max(...s.rows.map((r) => r.y2)) };
      put(b, 0, 0, el.w, el.h);
    }
  }

  // Warps: for u from 0 (left edge) to 1 (right edge), the top and bottom of the bent text as
  // fractions of the box height. a is how strong (0..0.8); up is the bend's direction.
  Z.WARPS = {
    arc: (u, a, up) => { const q = (2 * u - 1) ** 2, t = a * (up ? q : 1 - q); return [t, t + 1 - a]; },
    bulge: (u, a, up) => { const c = 1 - (2 * u - 1) ** 2, h = up ? 1 - a + a * c : 1 - a * c; return [(1 - h) / 2, (1 + h) / 2]; },
    wave: (u, a, up) => { const t = a * (0.5 - 0.5 * (up ? 1 : -1) * Math.sin(2 * Math.PI * u)); return [t, t + 1 - a]; },
    rise: (u, a, up) => { const t = a * (up ? 1 - u : u); return [t, t + 1 - a]; },
    persp: (u, a, up) => { const h = up ? 1 - a + a * u : 1 - a * u; return [(1 - h) / 2, (1 + h) / 2]; },
  };

  // Bent text is painted flat once, then redrawn in thin vertical strips, each squeezed into its
  // slice of the shape. The result is kept, so moving or rotating the box does not repaint it.
  const warpCache = new Map();
  if (document.fonts) document.fonts.addEventListener('loadingdone', () => warpCache.clear());
  function drawStretched(ctx, el, o) {
    const s = stretchLayout(el);
    if (!s.rows.length) return;
    const warp = Z.WARPS[el.warp];
    if (!warp || !el.bend) return paintFilled(ctx, el, s, o.ppm);
    // margins catch glyph overhangs and the highlight that reach past the ink box
    const mx = el.w * 0.06, my = el.h * 0.2, W = el.w + 2 * mx, H = el.h + 2 * my;
    const ppm = Math.min(o.ppm, 4096 / Math.max(W, H));
    const { x, y, rot, opacity, hidden, locked, slot, _layFont, ...look } = el;
    const key = el.id + '@' + ppm.toFixed(3);
    const sig = JSON.stringify(look);
    let hit = warpCache.get(key);
    if (!hit || hit.sig !== sig) {
      const flat = Z.canvas(W * ppm, H * ppm);
      const sx = flat.width / W, sy = flat.height / H;
      const fx = flat.getContext('2d');
      fx.setTransform(sx, 0, 0, sy, mx * sx, my * sy);
      paintFilled(fx, el, s, ppm);
      const out = Z.canvas(flat.width, flat.height);
      const ox = out.getContext('2d');
      ox.setTransform(sx, 0, 0, sy, mx * sx, my * sy);
      const a = (Math.min(100, Math.abs(el.bend)) / 100) * 0.8, up = el.bend > 0;
      const step = Math.max(1, Math.ceil(flat.width / 600));
      for (let px = 0; px < flat.width; px += step) {
        const sw = Math.min(step, flat.width - px);
        const left = px / sx - mx;
        const [t, b] = warp(Z.clamp((left + sw / sx / 2) / el.w, 0, 1), a, up);
        const k = b - t;
        // a hair wider than the strip so neighbouring strips leave no seam
        ox.drawImage(flat, px, 0, sw, flat.height, left, t * el.h - my * k, sw / sx + 0.5 / sx, H * k);
      }
      hit = { sig, canvas: out };
      warpCache.delete(key);
      warpCache.set(key, hit);
      if (warpCache.size > 60) warpCache.delete(warpCache.keys().next().value);
    }
    ctx.drawImage(hit.canvas, -mx, -my, W, H);
  }

  // --- photos
  Z.photoGeom = (el, project) => {
    const { w, h } = el;
    let ix = -w / 2, iy = -h / 2, iw = w, ih = h, bottom = 0;
    if (el.style === 'polaroid') {
      const pad = w * 0.055;
      bottom = w * 0.2;
      ix += pad; iy += pad; iw -= 2 * pad; ih -= pad + bottom;
    } else if (el.border > 0) {
      const b = Math.min(el.border, w / 3, h / 3);
      ix += b; iy += b; iw -= 2 * b; ih -= 2 * b;
    }
    const rec = el.photoId && Z.findPhoto(project, el.photoId);
    const a = rec ? rec.w / rec.h : iw / ih;
    let dw0, dh0;
    const wide = iw / ih > a;
    if ((el.fit === 'contain') === wide) { dh0 = ih; dw0 = ih * a; } else { dw0 = iw; dh0 = iw / a; }
    const dw = dw0 * el.zoom, dh = dh0 * el.zoom;
    const cx = ix + iw / 2 + (el.ox * (dw - iw)) / 2, cy = iy + ih / 2 + (el.oy * (dh - ih)) / 2;
    return { ix, iy, iw, ih, bottom, dw, dh, cx, cy, rec };
  };
  Z.photoNeed = (el, project, ppm) => {
    const g = Z.photoGeom(el, project);
    return { needPx: Math.max(32, g.dw * ppm), dwMm: g.dw };
  };

  function drawPhoto(ctx, el, o) {
    const g = Z.photoGeom(el, o.project);
    const { w, h } = el;
    const framed = el.style === 'polaroid' || el.border > 0;
    const outline = Z.edgePath(w, h, el.id, el.edge);
    if (el.shadow) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.28)';
      ctx.shadowBlur = 2.2 * o.ppm;
      ctx.shadowOffsetX = 0.6 * o.ppm;
      ctx.shadowOffsetY = 1.1 * o.ppm;
      ctx.fillStyle = framed ? (el.style === 'polaroid' ? '#fbfaf6' : el.borderColor) : '#ddd';
      ctx.fill(outline);
      ctx.restore();
    }
    if (framed) {
      ctx.fillStyle = el.style === 'polaroid' ? '#fbfaf6' : el.borderColor;
      ctx.fill(outline);
    }
    const src = el.photoId ? Z.photos.get(el, Z.photoNeed(el, o.project, o.ppm).needPx, g.dw) : null;
    const drawImg = () => {
      ctx.save();
      ctx.translate(g.cx, g.cy);
      if (el.flip) ctx.scale(-1, 1);
      ctx.drawImage(src, -g.dw / 2, -g.dh / 2, g.dw, g.dh);
      ctx.restore();
    };
    if (src && o.cropId === el.id) {
      ctx.save();
      ctx.globalAlpha *= 0.35;
      drawImg();
      ctx.restore();
    }
    ctx.save();
    if (framed) {
      ctx.beginPath();
      ctx.rect(g.ix, g.iy, g.iw, g.ih);
      ctx.clip();
    } else ctx.clip(outline);
    if (src) {
      if (el.blend === 'multiply') ctx.globalCompositeOperation = 'multiply';
      drawImg();
    } else if (o.editor) {
      ctx.fillStyle = el.photoId ? '#d9d4ca' : 'rgba(120,110,100,0.13)';
      ctx.fillRect(g.ix, g.iy, g.iw, g.ih);
      if (!el.photoId) {
        ctx.strokeStyle = 'rgba(90,80,70,0.45)';
        ctx.lineWidth = 0.35;
        ctx.setLineDash([1.5, 1.2]);
        ctx.strokeRect(g.ix + 0.6, g.iy + 0.6, g.iw - 1.2, g.ih - 1.2);
        ctx.setLineDash([]);
        const s = Math.min(g.iw, g.ih) * 0.12;
        ctx.fillStyle = 'rgba(90,80,70,0.5)';
        ctx.font = `${Math.max(2.5, s * 0.55)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('drop a photo', g.ix + g.iw / 2, g.iy + g.ih / 2 + s * 0.2);
      }
    }
    ctx.restore();
    if (el.caption) {
      const cap = Z.make.text({ id: el.id + 'c', text: el.caption, font: el.capFont, size: el.capSize, color: el.capColor, align: 'center', w: w * 0.9, lh: 1.05 });
      const lay = Z.layoutText(cap);
      cap.h = lay.h;
      ctx.save();
      const y = el.style === 'polaroid' ? h / 2 - g.bottom / 2 : h / 2 + 1.5 + lay.h / 2;
      ctx.translate(0, y);
      drawText(ctx, cap, o);
      ctx.restore();
    }
  }

  function drawSticker(ctx, el, o) {
    const m = new DOMMatrix().translate(-el.w / 2, -el.h / 2).scale(el.w / 100, el.h / 100);
    if (el.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 1.5 * o.ppm;
      ctx.shadowOffsetY = 0.8 * o.ppm;
    }
    for (const part of Z.stickerParts(el.kind)) {
      const p = new Path2D();
      p.addPath(part.path, m);
      ctx.lineJoin = ctx.lineCap = 'round';
      if (part.mode === 'fill') {
        ctx.fillStyle = el.fill;
        ctx.fill(p);
        ctx.shadowColor = 'transparent';
        if (el.sw > 0) { ctx.lineWidth = el.sw; ctx.strokeStyle = el.stroke; ctx.stroke(p); }
      } else if (part.mode === 'ink') {
        ctx.fillStyle = el.stroke;
        ctx.fill(p);
      } else {
        ctx.lineWidth = Math.max(el.sw, 0.3);
        ctx.strokeStyle = el.stroke;
        ctx.stroke(p);
      }
    }
    ctx.shadowColor = 'transparent';
  }

  function drawTape(ctx, el) {
    const p = Z.tapePath(el.w, el.h, el.id);
    ctx.fillStyle = el.color;
    ctx.fill(p);
    ctx.save();
    ctx.clip(p);
    ctx.globalAlpha *= 0.55;
    const s = el.h / 4;
    if (el.pattern === 'stripes') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = s * 0.6;
      for (let x = -el.w; x < el.w; x += s * 1.6) { ctx.beginPath(); ctx.moveTo(x, -el.h); ctx.lineTo(x + el.h * 2, el.h); ctx.stroke(); }
    } else if (el.pattern === 'dots') {
      ctx.fillStyle = '#ffffff';
      for (let x = -el.w / 2; x < el.w / 2; x += s * 1.3) for (let y = -el.h / 2 + s * 0.6; y < el.h / 2; y += s * 1.3) { ctx.beginPath(); ctx.arc(x + ((y * 7) % (s * 1.3)) * 0.5, y, s * 0.28, 0, 7); ctx.fill(); }
    } else if (el.pattern === 'grid') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = s * 0.15;
      for (let x = -el.w / 2; x < el.w / 2; x += s) { ctx.beginPath(); ctx.moveTo(x, -el.h); ctx.lineTo(x, el.h); ctx.stroke(); }
      for (let y = -el.h / 2; y < el.h / 2; y += s) { ctx.beginPath(); ctx.moveTo(-el.w, y); ctx.lineTo(el.w, y); ctx.stroke(); }
    } else if (el.pattern === 'checker') {
      ctx.fillStyle = '#ffffff';
      for (let x = -el.w / 2, i = 0; x < el.w / 2; x += s, i++) for (let y = -el.h / 2, j = 0; y < el.h / 2; y += s, j++) if ((i + j) % 2) ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 0.18;
    const g = ctx.createLinearGradient(0, -el.h / 2, 0, el.h / 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.addColorStop(1, '#000000');
    ctx.fillStyle = g;
    ctx.fillRect(-el.w, -el.h, el.w * 2, el.h * 2);
    ctx.restore();
  }

  function drawPaper(ctx, el, o) {
    const outer = Z.edgePath(el.w, el.h, el.id, el.edge);
    if (el.shadow) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 2 * o.ppm;
      ctx.shadowOffsetX = 0.5 * o.ppm;
      ctx.shadowOffsetY = 1 * o.ppm;
      ctx.fillStyle = el.color;
      ctx.fill(outer);
      ctx.restore();
    }
    if (el.edge === 'torn') {
      // the white paper core shows along a torn edge
      ctx.fillStyle = '#fdfbf5';
      ctx.fill(outer);
      const inner = Z.edgePath(el.w - 1.1, el.h - 1.1, el.id + 'i', 'torn');
      ctx.fillStyle = el.color;
      ctx.fill(inner);
    } else {
      ctx.fillStyle = el.color;
      ctx.fill(outer);
    }
    const pat = el.texture && el.texture !== 'none' && Z.texturePattern(ctx, el.texture, o.ppm);
    if (pat) {
      ctx.save();
      ctx.clip(outer);
      ctx.translate(-el.w / 2, -el.h / 2);
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, el.w, el.h);
      ctx.restore();
    }
  }

  function strokePath(el) {
    const sx = el.w / el.bw, sy = el.h / el.bh;
    const pts = el.pts.map(([x, y]) => [x * sx, y * sy]);
    const p = new Path2D();
    if (!pts.length) return p;
    p.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 1) p.lineTo(pts[0][0] + 0.01, pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      p.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    if (pts.length > 1) p.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    return p;
  }
  Z.strokePoints = (el) => {
    const sx = el.w / el.bw, sy = el.h / el.bh;
    return el.pts.map(([x, y]) => [x * sx, y * sy]);
  };
  function drawStroke(ctx, el) {
    const p = strokePath(el);
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.strokeStyle = el.color;
    if (el.brush === 'marker') {
      ctx.globalAlpha *= 0.88;
      ctx.lineWidth = el.width * 2.2;
      ctx.stroke(p);
    } else if (el.brush === 'highlighter') {
      ctx.globalAlpha *= 0.38;
      ctx.globalCompositeOperation = 'multiply';
      ctx.lineCap = 'butt';
      ctx.lineWidth = el.width * 5;
      ctx.stroke(p);
    } else if (el.brush === 'pencil') {
      const r = Z.rng(el.id);
      ctx.globalAlpha *= 0.55;
      ctx.lineWidth = el.width * 0.7;
      ctx.stroke(p);
      for (let k = 0; k < 3; k++) {
        ctx.save();
        ctx.globalAlpha *= 0.45;
        ctx.translate((r() - 0.5) * el.width * 0.5, (r() - 0.5) * el.width * 0.5);
        ctx.lineWidth = el.width * 0.35;
        ctx.setLineDash([el.width * (0.4 + r()), el.width * 0.3 * r()]);
        ctx.stroke(p);
        ctx.restore();
      }
    } else {
      ctx.lineWidth = el.width;
      ctx.stroke(p);
    }
  }

  Z.drawElement = (ctx, el, o) => {
    // a text box's height follows its words (unless they are stretched to the box); measure
    // before positioning by its centre
    if (el.type === 'text' && !el.fit) el.h = Math.max(Z.layoutText(el).h, 2);
    ctx.save();
    ctx.translate(el.x + el.w / 2, el.y + el.h / 2);
    if (el.rot) ctx.rotate(Z.rad(el.rot));
    ctx.globalAlpha = el.opacity == null ? 1 : el.opacity;
    if (el.type === 'photo') drawPhoto(ctx, el, o);
    else if (el.type === 'text') drawText(ctx, el, o);
    else if (el.type === 'sticker') drawSticker(ctx, el, o);
    else if (el.type === 'tape') drawTape(ctx, el, o);
    else if (el.type === 'paper') drawPaper(ctx, el, o);
    else if (el.type === 'draw') drawStroke(ctx, el, o);
    ctx.restore();
  };

  // Draw one page with its top-left at device pixel (x0, y0).
  // o: { ppm, x0, y0, project, facing (page or null), facingDx (mm), editor, cropId }
  Z.renderPage = (ctx, page, o) => {
    const { w: W, h: H } = Z.pageSize(o.project);
    ctx.save();
    ctx.setTransform(o.ppm, 0, 0, o.ppm, o.x0, o.y0);
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.fillStyle = page.bg.color || '#ffffff';
    ctx.fillRect(0, 0, W, H);
    if (page.bg.texture && page.bg.texture !== 'none') {
      const pat = Z.texturePattern(ctx, page.bg.texture, o.ppm);
      if (pat) {
        ctx.globalAlpha = page.bg.tex == null ? 0.6 : page.bg.tex;
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
    }
    for (const el of page.elements) if (!el.hidden) Z.drawElement(ctx, el, o);
    if (o.facing) {
      // elements on the facing page that cross the fold onto this one
      ctx.translate(o.facingDx, 0);
      for (const el of o.facing.elements) {
        if (el.hidden) continue;
        const b = Z.aabb(el, o.facingDx);
        if (b.x2 > 0 && b.x1 < W) Z.drawElement(ctx, el, o);
      }
    }
    ctx.restore();
  };

  // A page as a standalone canvas at `ppm` (used for export and thumbnails).
  Z.pageEntryFacing = (flat, idx, project = Z.state.project) => {
    const f = Z.facing(flat.length, idx, Z.bookLen(project, flat.length));
    if (f == null) return { facing: null, facingDx: 0 };
    const { w } = Z.pageSize(project);
    return { facing: flat[f].page, facingDx: f > idx ? w : -w };
  };
  Z.renderEntry = async (project, flat, idx, ppm, waitImages) => {
    const { w: W, h: H } = Z.pageSize(project);
    const page = flat[idx].page;
    const { facing, facingDx } = Z.pageEntryFacing(flat, idx, project);
    if (waitImages) {
      const els = page.elements.concat(facing ? facing.elements : []);
      for (const el of els) if (el.type === 'photo' && el.photoId) {
        const n = Z.photoNeed(el, project, ppm);
        await Z.photos.ensure(el, n.needPx, n.dwMm);
      }
    }
    const c = Z.canvas(W * ppm, H * ppm);
    const ctx = c.getContext('2d');
    Z.renderPage(ctx, page, { ppm: c.width / W, x0: 0, y0: 0, project, facing, facingDx, editor: false });
    return c;
  };
})();
