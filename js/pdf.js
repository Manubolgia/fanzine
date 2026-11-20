// A small PDF writer (JPEG pages only) and the print exports: booklet imposition, manual
// duplex, single pages and reading spreads. No libraries, nothing leaves the computer.
'use strict';
Z.pdf = {
  // pages: [{ w, h (points), images: [{ blob, px, py, x, y, w, h (points) }] }]
  async build(pages, title) {
    const enc = new TextEncoder();
    const parts = [];
    const offsets = [];
    let pos = 0;
    const push = (x) => {
      if (typeof x === 'string') x = enc.encode(x);
      parts.push(x);
      pos += x.size != null ? x.size : x.length;
    };
    const obj = (n, body) => {
      offsets[n] = pos;
      push(`${n} 0 obj\n${body}\nendobj\n`);
    };
    push('%PDF-1.4\n');
    push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
    let next = 3;
    const pageIds = [];
    const plan = pages.map((pg) => {
      const pid = next++;
      const cid = next++;
      const imgs = pg.images.map(() => next++);
      pageIds.push(pid);
      return { pg, pid, cid, imgs };
    });
    const infoId = next++;
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, `<< /Type /Pages /Kids [${pageIds.map((i) => i + ' 0 R').join(' ')}] /Count ${pageIds.length} >>`);
    const f = (v) => (+v).toFixed(3);
    for (const { pg, pid, cid, imgs } of plan) {
      const xo = imgs.map((id, i) => `/Im${i} ${id} 0 R`).join(' ');
      obj(pid, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(pg.w)} ${f(pg.h)}] /Resources << /XObject << ${xo} >> >> /Contents ${cid} 0 R >>`);
      // rot 180: the image is drawn upside down in the same box (mini zine top row)
      const content = pg.images.map((im, i) => (im.rot === 180
        ? `q ${f(-im.w)} 0 0 ${f(-im.h)} ${f(im.x + im.w)} ${f(pg.h - im.y)} cm /Im${i} Do Q`
        : `q ${f(im.w)} 0 0 ${f(im.h)} ${f(im.x)} ${f(pg.h - im.y - im.h)} cm /Im${i} Do Q`)).join('\n');
      obj(cid, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      for (let i = 0; i < imgs.length; i++) {
        const im = pg.images[i];
        offsets[imgs[i]] = pos;
        push(`${imgs[i]} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${im.px} /Height ${im.py} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.blob.size} >>\nstream\n`);
        push(im.blob);
        push('\nendstream\nendobj\n');
      }
    }
    const t = (title || 'Fanzine').replace(/[()\\]/g, '');
    obj(infoId, `<< /Title (${t}) /Producer (Fanzine Editor) >>`);
    const xref = pos;
    let x = `xref\n0 ${next}\n0000000000 65535 f \n`;
    for (let i = 1; i < next; i++) x += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    push(x);
    push(`trailer\n<< /Size ${next} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
  },
};

// Where every page goes on paper. Returns [{ name, sides: [{ w, h, slots: [{ idx, x, y, rot }] }] }]
// with sizes in mm and idx a 0-based index into Z.flat(). opts.mode: 'booklet' | 'manual' |
// 'mini' | 'pages' | 'spreads'.
Z.printPlan = (project, opts) => {
  const flat = Z.flat(project);
  const N = flat.length;
  const f = Z.pageSize(project);
  const base = Z.slug(project.title);
  const out = [];
  const bookletSide = (pair) => ({
    w: f.paperW, h: f.paperH,
    slots: pair.map((n, i) => ({ idx: n - 1, x: (f.paperW - 2 * f.w) / 2 + i * f.w, y: (f.paperH - f.h) / 2 })),
  });
  // two folded sheets on one paper sheet, one above the other, cut apart after printing.
  // The top halves hold the first sheets in order and the bottom halves the rest, so after
  // cutting, the bottom-half stack simply goes inside the top-half stack.
  const twoUp = (sheets, which) => {
    const k = Math.ceil(sheets.length / 2);
    const sides = [];
    for (let j = 0; j < k; j++) {
      const pair = [sheets[j], sheets[j + k]];
      const side = (key) => ({
        w: f.paperW, h: f.paperH,
        slots: pair.flatMap((sh, r) => (sh ? sh[key].map((n, i) => ({ idx: n - 1, x: (f.paperW - 2 * f.w) / 2 + i * f.w, y: (f.paperH - 2 * f.h) / 2 + r * f.h })) : [])),
      });
      sides.push(...which.map(side));
    }
    return sides;
  };
  if (opts.mode === 'booklet' || opts.mode === 'manual') {
    let sheets = Z.impose(N);
    const groups = [];
    if (f.book === 'fold2up') {
      if (opts.testOnly) groups.push(['test-sheet', sheets.slice(0, 1)]);
      else if (opts.coverSeparate && sheets.length > 1) groups.push(['cover-sheet', sheets.slice(0, 1)], ['inside-sheets', sheets.slice(1)]);
      else groups.push(['booklet', sheets]);
    } else {
      if (opts.testOnly) sheets = sheets.slice(0, 1);
      if (opts.coverSeparate && !opts.testOnly && sheets.length > 1) groups.push(['cover-sheet', sheets.slice(0, 1)], ['inside-sheets', sheets.slice(1)]);
      else groups.push([opts.testOnly ? 'test-sheet' : 'booklet', sheets]);
    }
    for (const [label, ss] of groups) {
      const make = (which) => (f.book === 'fold2up' ? twoUp(ss, which) : ss.flatMap((sh) => which.map((k) => bookletSide(sh[k]))));
      if (opts.mode === 'booklet') out.push({ name: `${base}-${label}-${f.paper}.pdf`, sides: make(['front', 'back']) });
      else {
        out.push({ name: `${base}-${label}-1-fronts-${f.paper}.pdf`, sides: make(['front']) });
        out.push({ name: `${base}-${label}-2-backs-${f.paper}.pdf`, sides: make(['back']) });
      }
    }
  } else if (opts.mode === 'mini') {
    const books = opts.testOnly ? 1 : N / 8;
    const sides = [];
    const y0 = (f.paperH - 2 * f.h) / 2, x0 = (f.paperW - 4 * f.w) / 2;
    for (let b = 0; b < books; b++) {
      const slots = [];
      Z.MINI_LAYOUT.top.forEach((n, c) => slots.push({ idx: b * 8 + n - 1, x: x0 + c * f.w, y: y0, rot: 180 }));
      Z.MINI_LAYOUT.bottom.forEach((n, c) => slots.push({ idx: b * 8 + n - 1, x: x0 + c * f.w, y: y0 + f.h }));
      sides.push({ w: f.paperW, h: f.paperH, slots });
    }
    out.push({ name: `${base}-${opts.testOnly ? 'test-sheet' : 'mini-zines'}-${f.paper}.pdf`, sides });
  } else if (opts.mode === 'pages') {
    out.push({ name: `${base}-pages-proof.pdf`, sides: flat.map((_, i) => ({ w: f.w, h: f.h, slots: [{ idx: i, x: 0, y: 0 }] })) });
  } else {
    const sp = Z.spreads(N, Z.bookLen(project, N));
    out.push({ name: `${base}-spreads.pdf`, sides: sp.map(([l, r]) => ({ w: 2 * f.w, h: f.h, slots: [l != null && { idx: l, x: 0, y: 0 }, r != null && { idx: r, x: f.w, y: 0 }].filter(Boolean) })) });
  }
  return out;
};

// Renders the pages a plan needs at opts.dpi and writes the PDFs. Returns [{ name, blob }].
Z.exportPrint = async (project, opts, onProgress, isCancelled) => {
  const flat = Z.flat(project);
  const f = Z.pageSize(project);
  const ppm = opts.dpi / 25.4;
  const pt = (mm) => mm * Z.MM_TO_PT;
  const plan = Z.printPlan(project, opts);
  const needed = new Set(plan.flatMap((file) => file.sides.flatMap((s) => s.slots.map((x) => x.idx))));
  const jpgs = new Map();
  let done = 0;
  const pageJpg = async (idx) => {
    if (jpgs.has(idx)) return jpgs.get(idx);
    if (isCancelled && isCancelled()) throw new Error('cancelled');
    const c = await Z.renderEntry(project, flat, idx, ppm, true);
    const blob = Z.canvasJpeg(c, opts.dpi >= 300 ? 0.92 : 0.85);
    const out = { blob, px: c.width, py: c.height };
    c.width = c.height = 1;
    jpgs.set(idx, out);
    done++;
    if (onProgress) onProgress(done, needed.size, flat[idx]);
    await Z.yieldUI();
    return out;
  };
  const files = [];
  for (const file of plan) {
    const pages = [];
    for (const side of file.sides) {
      const images = [];
      for (const s of side.slots) images.push({ ...(await pageJpg(s.idx)), x: pt(s.x), y: pt(s.y), w: pt(f.w), h: pt(f.h), rot: s.rot || 0 });
      pages.push({ w: pt(side.w), h: pt(side.h), images });
    }
    files.push({ name: file.name, blob: await Z.pdf.build(pages, project.title) });
  }
  return files;
};
