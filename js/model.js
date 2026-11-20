// Project structure: sections (cover, chapters, extras, back cover) holding pages holding elements.
'use strict';
Z.MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
Z.MONTH_PAPER = ['#eef1f4', '#f4ecee', '#eef2e8', '#f1f3e6', '#f6f1e2', '#f8f0e0', '#f9ecdf', '#f6ead9', '#f2e8dc', '#efe4d6', '#ebe6df', '#eef0f2'];
Z.PAPER = '#f7f2e8';

Z.defaultFilter = () => ({ mode: 'color', brightness: 0, contrast: 0, saturation: 0, warmth: 0, fade: 0, grain: 0, ink: '#1f3a5f', dot: 1.4 });

Z.make = {
  page: (extra = {}) => ({ id: Z.uid(), layout: null, bg: { color: Z.PAPER, texture: 'none', tex: 0.6 }, elements: [], spare: [], ...extra }),
  photo: (o = {}) => ({
    id: Z.uid(), type: 'photo', x: 10, y: 10, w: 60, h: 45, rot: 0, opacity: 1,
    photoId: null, fit: 'cover', zoom: 1, ox: 0, oy: 0, flip: false,
    style: 'plain', border: 0, borderColor: '#ffffff', edge: 'straight', shadow: false, blend: 'normal',
    filter: Z.defaultFilter(), caption: '', capFont: 'Caveat', capSize: 14, capColor: '#2b2b2b', ...o,
  }),
  text: (o = {}) => ({
    id: Z.uid(), type: 'text', x: 20, y: 20, w: 80, h: 10, rot: 0, opacity: 1,
    text: 'Write something', font: 'Caveat', size: 22, color: '#222222', align: 'left', lh: 1.15, spacing: 0,
    bold: false, italic: false, upper: false, bg: '', style: 'plain', outline: '', ...o,
  }),
  sticker: (o = {}) => ({ id: Z.uid(), type: 'sticker', kind: 'heart', x: 40, y: 40, w: 25, h: 25, rot: 0, opacity: 1, fill: '#d94f4f', stroke: '#222222', sw: 0, shadow: false, ...o }),
  tape: (o = {}) => ({ id: Z.uid(), type: 'tape', x: 40, y: 40, w: 38, h: 11, rot: -8, opacity: 0.82, color: '#e9d98a', pattern: 'plain', ...o }),
  paper: (o = {}) => ({ id: Z.uid(), type: 'paper', x: 30, y: 40, w: 70, h: 50, rot: -3, opacity: 1, color: '#fffdf6', texture: 'lined', edge: 'torn', shadow: true, ...o }),
  draw: (o = {}) => ({ id: Z.uid(), type: 'draw', x: 0, y: 0, w: 1, h: 1, bw: 1, bh: 1, rot: 0, opacity: 1, pts: [], color: '#222222', width: 0.8, brush: 'pen', ...o }),
};

// look: 'brutalist' (architecture magazine: grotesk and mono type, rules, black-and-white photos)
// or 'scrapbook' (handwriting, polaroids, collage).
Z.newProject = (format = 'A6', look = 'brutalist') => {
  const fmt = Z.FORMATS[format] || Z.FORMATS.A6;
  const p = {
    app: 'fanzine-editor', version: 1, title: 'Our Year', format, look,
    settings: { safe: fmt.safe, printer: 4, guides: true, snap: true, grid: false, paper: look === 'brutalist' ? '#f4f3ef' : Z.PAPER },
    sections: [],
    photos: [],
  };
  if (look === 'brutalist') return brutalist(p, fmt);
  if (fmt.book === 'mini') {
    // one little 8-page book per month: cover, six photo pages, a back page
    const inside = [['full', 'polaroid-1', 'two-v', 'single', 'full', 'polaroid-1'], ['polaroid-1', 'full', 'single', 'two-h', 'polaroid-1', 'full']];
    Z.MONTHS.forEach((m, i) => {
      const s = { id: Z.uid(), type: 'chapter', name: m, pages: [] };
      for (let k = 0; k < 8; k++) s.pages.push(Z.make.page({ bg: { color: k === 0 || k === 7 ? Z.MONTH_PAPER[i] : Z.PAPER, texture: 'none', tex: 0.6 } }));
      p.sections.push(s);
      Z.applyLayout(p, s.pages[0], i % 2 ? 'opener-polaroid' : 'opener-classic', s);
      inside[i % 2].forEach((l, k) => Z.applyLayout(p, s.pages[k + 1], l, s));
      Z.applyLayout(p, s.pages[7], 'back-note', s);
    });
    return p;
  }
  const cover = { id: Z.uid(), type: 'cover', name: 'Cover', pages: [Z.make.page()] };
  const intro = { id: Z.uid(), type: 'extra', name: 'Intro', pages: [Z.make.page()] };
  p.sections.push(cover, intro);
  Z.MONTHS.forEach((m, i) => {
    const s = { id: Z.uid(), type: 'chapter', name: m, pages: [] };
    s.pages.push(Z.make.page({ bg: { color: Z.MONTH_PAPER[i], texture: 'none', tex: 0.6 } }), Z.make.page(), Z.make.page());
    p.sections.push(s);
  });
  const back = { id: Z.uid(), type: 'back', name: 'Back cover', pages: [Z.make.page()] };
  p.sections.push(back);
  // starting layouts so the zine has a shape from the first minute
  Z.applyLayout(p, cover.pages[0], 'cover-classic', cover);
  Z.applyLayout(p, intro.pages[0], 'dedication', intro);
  const photoLayouts = [['two-v', 'polaroids-3'], ['four', 'single'], ['collage', 'two-h'], ['three', 'polaroid-1'], ['full', 'strip'], ['big-small', 'six']];
  const openers = ['opener-classic', 'opener-type', 'opener-polaroid'];
  p.sections.filter((s) => s.type === 'chapter').forEach((s, i) => {
    Z.applyLayout(p, s.pages[0], openers[i % openers.length], s);
    const pair = photoLayouts[i % photoLayouts.length];
    Z.applyLayout(p, s.pages[1], pair[0], s);
    Z.applyLayout(p, s.pages[2], pair[1], s);
  });
  Z.applyLayout(p, back.pages[0], 'back-note', back);
  return p;
};

function brutalist(p, fmt) {
  const paper = () => ({ color: '#f4f3ef', texture: 'none', tex: 0.6 });
  const concrete = () => ({ color: '#d6d4cf', texture: 'grain', tex: 0.5 });
  const pages = ['b-fig', 'b-grid', 'b-split', 'b-bleed', 'b-plan', 'b-column'];
  if (fmt.book === 'mini') {
    Z.MONTHS.forEach((m, i) => {
      const s = { id: Z.uid(), type: 'chapter', name: m, pages: [] };
      for (let k = 0; k < 8; k++) s.pages.push(Z.make.page({ bg: k === 0 ? concrete() : paper() }));
      p.sections.push(s);
      Z.applyLayout(p, s.pages[0], 'b-opener', s);
      ['b-bleed', 'b-fig', 'full', 'b-column', 'b-split', 'b-fig'].forEach((l, k) => Z.applyLayout(p, s.pages[k + 1], l, s));
      Z.applyLayout(p, s.pages[7], 'b-back', s);
    });
    return p;
  }
  const cover = { id: Z.uid(), type: 'cover', name: 'Cover', pages: [Z.make.page({ bg: paper() })] };
  const intro = { id: Z.uid(), type: 'extra', name: 'Intro', pages: [Z.make.page({ bg: paper() })] };
  p.sections.push(cover, intro);
  Z.applyLayout(p, cover.pages[0], 'b-cover', cover);
  Z.applyLayout(p, intro.pages[0], 'b-text', intro);
  Z.MONTHS.forEach((m, i) => {
    const s = { id: Z.uid(), type: 'chapter', name: m, pages: [Z.make.page({ bg: concrete() }), Z.make.page({ bg: paper() }), Z.make.page({ bg: paper() })] };
    p.sections.push(s);
    Z.applyLayout(p, s.pages[0], 'b-opener', s);
    Z.applyLayout(p, s.pages[1], pages[(2 * i) % pages.length], s);
    Z.applyLayout(p, s.pages[2], pages[(2 * i + 1) % pages.length], s);
  });
  const back = { id: Z.uid(), type: 'back', name: 'Back cover', pages: [Z.make.page({ bg: paper() })] };
  p.sections.push(back);
  Z.applyLayout(p, back.pages[0], 'b-back', back);
  return p;
}

Z.pageSize = (p) => Z.FORMATS[p.format] || Z.FORMATS.A5;
Z.isMini = (p) => Z.pageSize(p).book === 'mini';
// pages per physical book: a mini zine is always 8; a booklet is the whole zine
Z.bookLen = (p, n) => (Z.isMini(p) ? 8 : n);

// Reading order of every printed page, with blank pages added where the paper needs them:
// a booklet needs a multiple of 4 pages (added before the back cover); a mini zine is exactly
// 8 pages, so each section is filled up to a multiple of 8.
Z.flat = (p) => {
  const out = [];
  const padPage = (i) => ({ id: 'pad' + i, pad: true, bg: { color: p.settings.paper || Z.PAPER, texture: 'none', tex: 0.6 }, elements: [] });
  let npad = 0;
  if (Z.isMini(p)) {
    for (const s of p.sections) {
      s.pages.forEach((page, i) => out.push({ page, section: s, idx: i }));
      const pad = (8 - (s.pages.length % 8)) % 8;
      for (let i = 0; i < pad; i++) out.push({ page: padPage(npad++), section: null, padSection: s, pad: true });
    }
  } else {
    let back = null;
    for (const s of p.sections) {
      if (s.type === 'back') {
        back = s;
        continue;
      }
      s.pages.forEach((page, i) => out.push({ page, section: s, idx: i }));
    }
    const total = out.length + (back ? 1 : 0);
    const pad = (4 - (total % 4)) % 4;
    const last = [...p.sections].reverse().find((s) => s.type !== 'back');
    for (let i = 0; i < pad; i++) out.push({ page: padPage(npad++), section: null, padSection: last, pad: true });
    if (back) out.push({ page: back.pages[0], section: back, idx: 0 });
  }
  const bl = Z.bookLen(p, out.length);
  out.forEach((e, i) => {
    e.n = i + 1;
    e.book = Math.floor(i / bl);
    e.bn = (i % bl) + 1;
  });
  return out;
};

// Reading spreads per book: its cover alone on the right, then 2|3, 4|5 ... and its back
// cover alone on the left. Indexes are 0-based into the flat list.
Z.spreads = (n, bl = n) => {
  const s = [];
  for (let b = 0; b < n; b += bl) {
    const len = Math.min(bl, n - b);
    s.push([null, b]);
    for (let i = 1; i < len - 1; i += 2) s.push([b + i, i + 1 < len - 1 ? b + i + 1 : null]);
    if (len > 1) s.push([b + len - 1, null]);
  }
  return s;
};
Z.spreadOf = (n, idx, bl = n) => Z.spreads(n, bl).findIndex((sp) => sp.includes(idx));

// The page printed opposite this one in a reading spread, used for elements that run across
// the fold.
Z.facing = (n, idx, bl = n) => {
  const b = Math.floor(idx / bl) * bl, len = Math.min(bl, n - b), i = idx - b;
  if (i <= 0 || i >= len - 1) return null;
  const f = i % 2 === 1 ? i + 1 : i - 1;
  return f > 0 && f < len - 1 ? b + f : null;
};

// Saddle-stitch imposition. n is a multiple of 4. Sheet 0 is the outer sheet (covers).
// Page numbers are 1-based. Each side is [left half, right half] of the folded sheet.
Z.impose = (n) => {
  const sheets = [];
  for (let s = 0; s < n / 4; s++) {
    sheets.push({ front: [n - 2 * s, 1 + 2 * s], back: [2 + 2 * s, n - 1 - 2 * s] });
  }
  return sheets;
};

// One-sheet mini zine (8 pages, printed on one side). Panels left to right; the top row is
// printed upside down so it reads the right way once the sheet is folded.
Z.MINI_LAYOUT = { top: [5, 4, 3, 2], bottom: [6, 7, 8, 1] };

Z.findSection = (p, page) => p.sections.find((s) => s.pages.includes(page));
Z.findPhoto = (p, id) => p.photos.find((x) => x.id === id);
Z.pageLabel = (entry) => {
  if (!entry) return '';
  const pre = Z.isMini(Z.state.project) ? `Book ${entry.book + 1} · p${entry.bn}` : `p${entry.n}`;
  if (entry.pad) return `${pre} · blank (padding)`;
  if (entry.section.type === 'cover') return 'Cover';
  if (entry.section.type === 'back') return 'Back cover';
  return `${pre} · ${entry.section.name}`;
};

// Which photos are placed somewhere, and on which pages.
Z.photoUse = (p) => {
  const use = new Map();
  for (const s of p.sections)
    for (const pg of s.pages)
      for (const el of pg.elements)
        if (el.type === 'photo' && el.photoId) use.set(el.photoId, (use.get(el.photoId) || 0) + 1);
  return use;
};
