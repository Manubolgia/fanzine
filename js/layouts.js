// Page templates. Each returns slots in mm for a page W x H with safe margin m.
// Photo slots are filled with the page's photos in order; text slots keep their words when you switch.
'use strict';
const L = {};
const ph = (slot, x, y, w, h, o = {}) => ({ kind: 'photo', slot, x, y, w, h, ...o });
const tx = (slot, x, y, w, o = {}) => ({ kind: 'text', slot, x, y, w, ...o });
const sh = (slot, x, y, w, h, o = {}) => ({ kind: 'shape', slot, x, y, w, h, shape: 'bar', ...o });
// brutalist / architecture-magazine house style
const BW = () => ({ ...Z.defaultFilter(), mode: 'bw', contrast: 35, grain: 10 });
const MONO = { font: 'IBM Plex Mono', size: 8, upper: true, spacing: 6 };
const HEAD = { font: 'Archivo Black', upper: true, lh: 0.9, spacing: -2 };
const BIG = { font: 'Big Shoulders Display', bold: true, lh: 0.78, spacing: -3 };
const SERIF = { font: 'Newsreader', size: 10, lh: 1.38 };

L['full'] = { name: 'Full bleed', group: 'Photo pages', make: (W, H) => [ph('p0', 0, 0, W, H)] };
L['single'] = {
  name: 'One + caption', group: 'Photo pages',
  make: (W, H, m) => [ph('p0', m + 4, m + 6, W - 2 * m - 8, (W - 2 * m - 8) * 1.2), tx('caption', m + 4, m + 12 + (W - 2 * m - 8) * 1.2, W - 2 * m - 8, { text: 'a little note about this one', font: 'Caveat', size: 18, align: 'center' })],
};
L['two-v'] = {
  name: '2 stacked', group: 'Photo pages',
  make: (W, H, m) => { const h = (H - 2 * m - 5) / 2; return [ph('p0', m, m, W - 2 * m, h), ph('p1', m, m + h + 5, W - 2 * m, h)]; },
};
L['two-h'] = {
  name: '2 side by side', group: 'Photo pages',
  make: (W, H, m) => { const w = (W - 2 * m - 4) / 2, h = w * 1.5, y = (H - h) / 2 - 6; return [ph('p0', m, y, w, h), ph('p1', m + w + 4, y, w, h), tx('caption', m, y + h + 5, W - 2 * m, { text: 'same day, two moods', font: 'Special Elite', size: 11, align: 'center' })]; },
};
L['three'] = {
  name: '1 big + 2', group: 'Photo pages',
  make: (W, H, m) => { const g = 4, bw = W - 2 * m, bh = (H - 2 * m - g) * 0.58, sw = (bw - g) / 2, sh = H - 2 * m - g - bh; return [ph('p0', m, m, bw, bh), ph('p1', m, m + bh + g, sw, sh), ph('p2', m + sw + g, m + bh + g, sw, sh)]; },
};
L['three-col'] = {
  name: '3 strips', group: 'Photo pages',
  make: (W, H, m) => { const g = 3, w = (W - 2 * m - 2 * g) / 3, h = H - 2 * m - 16; return [0, 1, 2].map((i) => ph('p' + i, m + i * (w + g), m, w, h)).concat([tx('caption', m, H - m - 10, W - 2 * m, { text: 'left to right', font: 'Special Elite', size: 10, align: 'center' })]); },
};
L['four'] = {
  name: 'Grid of 4', group: 'Photo pages',
  make: (W, H, m) => { const g = 4, w = (W - 2 * m - g) / 2, h = (H - 2 * m - g) / 2; return [0, 1, 2, 3].map((i) => ph('p' + i, m + (i % 2) * (w + g), m + Math.floor(i / 2) * (h + g), w, h)); },
};
L['six'] = {
  name: 'Grid of 6', group: 'Photo pages',
  make: (W, H, m) => { const g = 3, w = (W - 2 * m - g) / 2, h = (H - 2 * m - 2 * g) / 3; return [0, 1, 2, 3, 4, 5].map((i) => ph('p' + i, m + (i % 2) * (w + g), m + Math.floor(i / 2) * (h + g), w, h)); },
};
L['nine'] = {
  name: 'Contact sheet', group: 'Photo pages',
  make: (W, H, m) => { const g = 2.5, w = (W - 2 * m - 2 * g) / 3, h = w * 1.25, y0 = m + 8; return [...Array(9).keys()].map((i) => ph('p' + i, m + (i % 3) * (w + g), y0 + Math.floor(i / 3) * (h + g), w, h, { border: 1.2, borderColor: '#111111' })).concat([tx('title', m, m - 1, W - 2 * m, { text: 'ROLL 01', font: 'Courier Prime', size: 10, align: 'left' })]); },
};
L['polaroid-1'] = {
  name: 'Polaroid', group: 'Photo pages',
  make: (W, H) => { const w = W * 0.72, h = w * 1.2; return [ph('p0', (W - w) / 2, (H - h) / 2 - 4, w, h, { style: 'polaroid', rot: -3, shadow: true, caption: 'us', capFont: 'Caveat' })]; },
};
L['polaroids-2'] = {
  name: '2 polaroids', group: 'Photo pages',
  make: (W, H) => { const w = W * 0.6, h = w * 1.2; return [ph('p0', W * 0.08, H * 0.05, w, h, { style: 'polaroid', rot: -5, shadow: true, caption: 'this', capFont: 'Caveat' }), ph('p1', W * 0.32, H * 0.48, w, h, { style: 'polaroid', rot: 4, shadow: true, caption: 'and this', capFont: 'Caveat' })]; },
};
L['polaroids-3'] = {
  name: '3 polaroids', group: 'Photo pages',
  make: (W, H) => { const w = W * 0.5, h = w * 1.2; return [ph('p0', W * 0.06, H * 0.04, w, h, { style: 'polaroid', rot: -6, shadow: true, capFont: 'Caveat' }), ph('p1', W * 0.44, H * 0.3, w, h, { style: 'polaroid', rot: 5, shadow: true, capFont: 'Caveat' }), ph('p2', W * 0.1, H * 0.6, w, h, { style: 'polaroid', rot: -2, shadow: true, capFont: 'Caveat' })]; },
};
L['collage'] = {
  name: 'Scattered collage', group: 'Photo pages',
  make: (W, H) => [
    ph('p0', W * 0.05, H * 0.04, W * 0.55, H * 0.3, { rot: -4, shadow: true, border: 2 }),
    ph('p1', W * 0.45, H * 0.18, W * 0.5, H * 0.32, { rot: 3, shadow: true, border: 2 }),
    ph('p2', W * 0.08, H * 0.4, W * 0.48, H * 0.28, { rot: 2, shadow: true, border: 2 }),
    ph('p3', W * 0.42, H * 0.56, W * 0.52, H * 0.3, { rot: -3, shadow: true, border: 2 }),
    ph('p4', W * 0.1, H * 0.7, W * 0.36, H * 0.24, { rot: 5, shadow: true, border: 2 }),
  ],
};
L['strip'] = {
  name: 'Photo booth strip', group: 'Photo pages',
  make: (W, H, m) => { const w = W * 0.36, g = 3, h = (H - 2 * m - 8 - 3 * g) / 4, x = m + 4; return [0, 1, 2, 3].map((i) => ph('p' + i, x, m + 4 + i * (h + g), w, h, { filter: { ...Z.defaultFilter(), mode: 'bw', contrast: 15 } })).concat([tx('caption', x + w + 8, H * 0.38, W - x - w - 8 - m, { text: 'four seconds\nof us being\nridiculous', font: 'Reenie Beanie', size: 26, align: 'left' })]); },
};
L['big-small'] = {
  name: 'Bleed + inset', group: 'Photo pages',
  make: (W, H) => [ph('p0', 0, 0, W, H * 0.62), ph('p1', W * 0.5, H * 0.5, W * 0.42, W * 0.42 * 1.15, { border: 3, shadow: true, rot: 3 }), tx('caption', W * 0.08, H * 0.7, W * 0.38, { text: 'remember\nthis?', font: 'Permanent Marker', size: 20 })],
};
L['text-photo'] = {
  name: 'Photo + journal', group: 'Photo pages',
  make: (W, H, m) => [ph('p0', 0, 0, W, H * 0.5), tx('title', m, H * 0.5 + 8, W - 2 * m, { text: 'Dear diary,', font: 'Homemade Apple', size: 16 }), tx('body', m, H * 0.5 + 22, W - 2 * m, { text: 'Write the story of this day here. What you ate, what she said, what the weather was doing.', font: 'Special Elite', size: 11, lh: 1.5 })],
};

// chapter openers
L['opener-classic'] = {
  name: 'Opener: title + photo', group: 'Chapter openers',
  make: (W, H, m) => [tx('number', m, m + 4, W - 2 * m, { text: '{num}', font: 'Special Elite', size: 14, align: 'left', spacing: 30 }), tx('title', m, m + 12, W - 2 * m, { text: '{name}', font: 'Abril Fatface', size: 52, align: 'left', lh: 1 }), ph('p0', m, H * 0.4, W - 2 * m, H * 0.6 - m)],
};
L['opener-full'] = {
  name: 'Opener: full photo', group: 'Chapter openers',
  make: (W, H, m) => [ph('p0', 0, 0, W, H), tx('title', m, H - m - 32, W - 2 * m, { text: '{name}', font: 'Bebas Neue', size: 72, align: 'left', color: '#ffffff', lh: 0.9 })],
};
L['opener-polaroid'] = {
  name: 'Opener: polaroid', group: 'Chapter openers',
  make: (W, H, m) => { const w = W * 0.62, h = w * 1.2; return [tx('title', m, m + 6, W - 2 * m, { text: '{name}', font: 'Caveat', size: 60, align: 'center', lh: 1 }), ph('p0', (W - w) / 2, H * 0.3, w, h, { style: 'polaroid', rot: 3, shadow: true, capFont: 'Caveat' })]; },
};
L['opener-type'] = {
  name: 'Opener: big type', group: 'Chapter openers',
  make: (W, H, m) => [tx('number', m, H * 0.1, W - 2 * m, { text: '{num2}', font: 'Monoton', size: 120, align: 'center', lh: 1, color: '#c8553d' }), tx('title', m, H * 0.48, W - 2 * m, { text: '{name}', font: 'Playfair Display', size: 40, align: 'center', italic: true }), tx('body', m + 10, H * 0.62, W - 2 * m - 20, { text: 'a few words about this month', font: 'Caveat', size: 18, align: 'center' })],
};
L['opener-ransom'] = {
  name: 'Opener: ransom note', group: 'Chapter openers',
  make: (W, H, m) => [tx('title', m, H * 0.36, W - 2 * m, { text: '{name}', font: 'Anton', size: 40, align: 'center', style: 'ransom', lh: 1.25 }), ph('p0', W * 0.2, H * 0.58, W * 0.6, H * 0.3, { rot: -2, filter: { ...Z.defaultFilter(), mode: 'photocopy' } })],
};

// covers
L['cover-classic'] = {
  name: 'Cover: title + photo', group: 'Covers',
  make: (W, H, m) => [tx('title', m, m + 6, W - 2 * m, { text: '{title}', font: 'Abril Fatface', size: 44, align: 'center', lh: 1 }), ph('p0', m + 6, H * 0.3, W - 2 * m - 12, H * 0.5), tx('body', m, H - m - 14, W - 2 * m, { text: 'a zine for you · 2026', font: 'Special Elite', size: 11, align: 'center', spacing: 20 })],
};
L['cover-full'] = {
  name: 'Cover: full photo', group: 'Covers',
  make: (W, H, m) => [ph('p0', 0, 0, W, H), tx('title', m, m + 8, W - 2 * m, { text: '{title}', font: 'Bebas Neue', size: 80, align: 'left', color: '#ffffff', lh: 0.9 })],
};
L['cover-collage'] = {
  name: 'Cover: collage', group: 'Covers',
  make: (W, H, m) => [
    ph('p0', W * 0.04, H * 0.05, W * 0.5, H * 0.3, { rot: -5, border: 2, shadow: true }), ph('p1', W * 0.46, H * 0.08, W * 0.5, H * 0.3, { rot: 4, border: 2, shadow: true }),
    ph('p2', W * 0.06, H * 0.58, W * 0.46, H * 0.32, { rot: 3, border: 2, shadow: true }), ph('p3', W * 0.48, H * 0.6, W * 0.46, H * 0.3, { rot: -3, border: 2, shadow: true }),
    tx('title', m, H * 0.4, W - 2 * m, { text: '{title}', font: 'Anton', size: 40, align: 'center', style: 'ransom', lh: 1.25 }),
  ],
};
L['dedication'] = {
  name: 'Dedication', group: 'Covers',
  make: (W, H, m) => [tx('title', m, H * 0.36, W - 2 * m, { text: 'for you,', font: 'Homemade Apple', size: 26, align: 'center' }), tx('body', m + 8, H * 0.48, W - 2 * m - 16, { text: 'twelve months, a few hundred photos, and the best ones are in here.', font: 'Special Elite', size: 11, align: 'center', lh: 1.5 })],
};
L['back-note'] = {
  name: 'Back: little note', group: 'Covers',
  make: (W, H, m) => [ph('p0', W * 0.3, H * 0.28, W * 0.4, W * 0.4 * 1.2, { style: 'polaroid', rot: -4, shadow: true }), tx('body', m, H * 0.66, W - 2 * m, { text: 'made by hand, with love\nChristmas 2026', font: 'Caveat', size: 18, align: 'center' })],
};

// brutalist / architecture magazine
L['b-cover'] = {
  name: 'Cover: magazine', group: 'Brutalist / architecture',
  make: (W, H, m) => [
    tx('number', m, m, W / 2 - m, { text: 'Nº 01', ...MONO }), tx('date', W / 2, m, W / 2 - m, { text: 'Winter 2026', ...MONO, align: 'right' }),
    sh('rule', m, m + 6, W - 2 * m, 1.6),
    ph('p0', m, m + 12, W - 2 * m, H * 0.5, { filter: BW() }),
    tx('title', m - 0.5, m + 16 + H * 0.5, W - 2 * m, { text: '{title}', ...BIG, size: 78, upper: true }),
    sh('rule2', m, H - m - 12, W - 2 * m, 0.4),
    tx('body', m, H - m - 9, W - 2 * m, { text: 'A year in photographs · twelve chapters', ...MONO }),
  ],
};
L['b-opener'] = {
  name: 'Opener: giant number', group: 'Brutalist / architecture',
  make: (W, H, m) => [
    tx('number', m - 1, m + 6, W - 2 * m, { text: '{num2}', ...BIG, size: 200 }),
    sh('rule', m, H * 0.47, W - 2 * m, 1.2),
    tx('title', m, H * 0.47 + 4, W - 2 * m, { text: '{name}', ...HEAD, size: 30 }),
    tx('body', m, H * 0.47 + 18, W * 0.5 - m, { text: 'Chapter {num2}\n2026', ...MONO }),
    ph('p0', W * 0.5, H * 0.6, W * 0.5 - m, H * 0.4 - m, { filter: BW() }),
    tx('caption', m, H * 0.72, W * 0.5 - m - 5, { text: 'Notes on the month: where we went, what we saw, what we said.', ...SERIF, size: 9 }),
  ],
};
L['b-fig'] = {
  name: 'Figure + text', group: 'Brutalist / architecture',
  make: (W, H, m) => [
    ph('p0', 0, 0, W, H * 0.62, { filter: BW() }),
    sh('rule', m, H * 0.62 + 6, W - 2 * m, 0.4),
    tx('number', m, H * 0.62 + 9, 26, { text: 'Fig. 01', ...MONO }),
    tx('body', m + 30, H * 0.62 + 8.5, W - 2 * m - 30, { text: 'Describe it like an architecture magazine would: the place, the light, the material, the hour.', ...SERIF }),
  ],
};
L['b-grid'] = {
  name: 'Index grid', group: 'Brutalist / architecture',
  make: (W, H, m) => {
    const g = 4, w = (W - 2 * m - g) / 2, top = m + 10, rowH = (H - top - m) / 3, h = rowH - 7;
    const out = [tx('title', m, m, W - 2 * m, { text: '{name} — index', ...MONO }), sh('rule', m, m + 5, W - 2 * m, 0.8)];
    for (let i = 0; i < 6; i++) {
      const x = m + (i % 2) * (w + g), y = top + Math.floor(i / 2) * rowH;
      out.push(ph('p' + i, x, y, w, h, { filter: BW() }), tx('c' + i, x, y + h + 1.2, w, { text: '0' + (i + 1), ...MONO, size: 7 }));
    }
    return out;
  },
};
L['b-bleed'] = {
  name: 'Bleed + label', group: 'Brutalist / architecture',
  make: (W, H, m) => [ph('p0', 0, 0, W, H, { filter: BW() }), tx('caption', m, H - m - 10, W * 0.62, { text: 'Site visit, 14:20', ...MONO, bg: '#111111', color: '#ffffff' })],
};
L['b-column'] = {
  name: 'Column + tall photo', group: 'Brutalist / architecture',
  make: (W, H, m) => [
    ph('p0', W * 0.42, 0, W * 0.58, H, { filter: BW() }),
    tx('number', m - 0.5, m - 1, W * 0.42 - m, { text: '03', ...BIG, size: 64 }),
    sh('rule', m, m + 25, W * 0.42 - m - 5, 0.4),
    tx('body', m, m + 29, W * 0.42 - m - 5, { text: 'A short text column. Write what happened that day, plainly, like a caption in a building monograph. Keep it short: white space is part of the design.', ...SERIF, size: 9 }),
    tx('caption', m, H - m - 6, W * 0.42 - m - 5, { text: 'Concrete, light, us', ...MONO, size: 7 }),
  ],
};
L['b-split'] = {
  name: 'Split + black bar', group: 'Brutalist / architecture',
  make: (W, H, m) => [
    ph('p0', 0, 0, W, H * 0.47, { filter: BW() }), sh('bar', 0, H * 0.47, W, 6), ph('p1', 0, H * 0.47 + 6, W, H * 0.53 - 6, { filter: BW() }),
    tx('caption', m, H * 0.47 + 1.4, W - 2 * m, { text: 'Before / after', ...MONO, size: 7, color: '#ffffff' }),
  ],
};
L['b-plan'] = {
  name: 'Two figures + rules', group: 'Brutalist / architecture',
  make: (W, H, m) => {
    const w = W - 2 * m, h1 = H * 0.42, h2 = H * 0.3;
    return [
      sh('rule', m, m, w, 1.2), tx('title', m, m + 3, w, { text: '{name}', ...HEAD, size: 18 }),
      ph('p0', m, m + 14, w, h1, { filter: BW() }), tx('c0', m, m + 15 + h1, w, { text: 'Fig. 1 — elevation', ...MONO, size: 7 }),
      ph('p1', m + w * 0.35, m + 22 + h1, w * 0.65, h2, { filter: BW() }), tx('c1', m, m + 22 + h1, w * 0.32, { text: 'Fig. 2 — detail. A few words on what makes this one matter.', ...SERIF, size: 8.5 }),
      sh('mark', W - m - 6, H - m - 6, 6, 6, { shape: 'register' }),
    ];
  },
};
L['b-text'] = {
  name: 'Foreword', group: 'Brutalist / architecture',
  make: (W, H, m) => [
    tx('number', m, m, W - 2 * m, { text: 'Foreword', ...MONO }), sh('rule', m, m + 5, W - 2 * m, 0.8),
    tx('title', m, H * 0.26, W - 2 * m, { text: 'For you.', font: 'Instrument Serif', size: 48, lh: 1 }),
    tx('body', m, H * 0.44, W * 0.72, { text: 'Twelve months, a few hundred photographs, and the best of them are in here. Read it slowly.', ...SERIF, size: 11 }),
  ],
};
L['b-back'] = {
  name: 'Back: colophon', group: 'Brutalist / architecture',
  make: (W, H, m) => [
    sh('mark', W / 2 - 5, H * 0.3, 10, 10, { shape: 'register' }),
    tx('title', m, H - m - 34, W - 2 * m, { text: '{title}', ...HEAD, size: 22 }),
    sh('rule', m, H - m - 16, W - 2 * m, 0.8),
    tx('body', m, H - m - 13, W - 2 * m, { text: 'Printed at home · December 2026\nEdition of one', ...MONO, size: 7 }),
  ],
};
L['blank'] = { name: 'Blank page', group: 'Photo pages', make: () => [] };

Z.LAYOUTS = L;

const NUM_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen'];
const fillWords = (s, p, section) => {
  const chapters = p.sections.filter((x) => x.type === 'chapter');
  const ci = chapters.indexOf(section);
  return s
    .replace('{name}', section ? section.name : '')
    .replace('{title}', p.title)
    .replace('{num}', ci >= 0 ? 'chapter ' + (NUM_WORDS[ci] || ci + 1) : '')
    .replace('{num2}', ci >= 0 ? String(ci + 1).padStart(2, '0') : '');
};

// Switch a page's template. Photos (with their crop and filters) move into the new frames in
// order; photos that don't fit wait in page.spare and come back when you switch to a bigger
// template. Elements you added yourself are left alone.
Z.applyLayout = (p, page, layoutId, section) => {
  const lay = L[layoutId];
  if (!lay) return;
  const { w: W, h: H } = Z.pageSize(p);
  const m = p.settings.safe;
  // templates are drawn for A5; text shrinks with smaller pages but stays readable
  const tk = W / 148.5;
  const fit = (pt) => Math.round(Math.max(pt * tk, Math.min(pt, 7)) * 2) / 2;
  section = section || Z.findSection(p, page);
  const old = page.elements.filter((e) => e.slot);
  const keep = page.elements.filter((e) => !e.slot);
  const oldPhotos = old.filter((e) => e.type === 'photo' && e.photoId).concat(page.spare || []);
  const oldTexts = Object.fromEntries(old.filter((e) => e.type === 'text').map((e) => [e.slot, e]));
  const out = [];
  let pi = 0;
  for (const s of lay.make(W, H, m)) {
    if (s.kind === 'photo') {
      const el = Z.make.photo({ x: s.x, y: s.y, w: s.w, h: s.h, rot: s.rot || 0, style: s.style || 'plain', border: s.border || 0, borderColor: s.borderColor || '#ffffff', shadow: !!s.shadow, caption: s.caption || '', capFont: s.capFont || 'Caveat', capSize: fit(14), slot: s.slot });
      if (s.filter) el.filter = { ...s.filter };
      const prev = oldPhotos[pi++];
      if (prev) {
        Object.assign(el, { photoId: prev.photoId, zoom: 1, ox: 0, oy: 0, flip: prev.flip, filter: { ...prev.filter }, blend: prev.blend, edge: prev.edge });
        if (prev.caption) el.caption = prev.caption;
      }
      out.push(el);
    } else if (s.kind === 'shape') {
      const d = Z.STICKERS[s.shape] || {};
      out.push(Z.make.sticker({ kind: s.shape, x: s.x, y: s.y, w: s.w, h: s.h, fill: s.fill || d.fill || '#111111', stroke: s.stroke || d.stroke || '#111111', sw: d.sw || 0, slot: s.slot }));
    } else {
      const prev = oldTexts[s.slot];
      const el = Z.make.text({ x: s.x, y: s.y, w: s.w, text: fillWords(s.text, p, section), font: s.font, size: fit(s.size), align: s.align || 'left', lh: s.lh || 1.15, spacing: s.spacing || 0, color: s.color || '#111111', italic: !!s.italic, bold: !!s.bold, upper: !!s.upper, bg: s.bg || '', style: s.style || 'plain', slot: s.slot });
      if (prev) Object.assign(el, { text: prev.text, color: prev.color, font: prev._layFont && prev.font !== prev._layFont ? prev.font : el.font });
      el._layFont = s.font;
      out.push(el);
    }
  }
  page.spare = oldPhotos.slice(pi).map((e) => ({ photoId: e.photoId, flip: e.flip, filter: e.filter, blend: e.blend, edge: e.edge, caption: e.caption }));
  page.elements = out.concat(keep);
  page.layout = layoutId;
};

// Fill a chapter's photo pages with its tray photos that aren't placed yet, adding pages
// (with varied templates) when it runs out of empty frames.
Z.autoFill = (p, section) => {
  const used = Z.photoUse(p);
  const queue = p.photos.filter((ph) => ph.sectionId === section.id && !used.has(ph.id)).map((x) => x.id);
  if (!queue.length) return 0;
  let placed = 0;
  for (const page of section.pages) {
    for (const el of page.elements) if (el.type === 'photo' && !el.photoId && queue.length) { el.photoId = queue.shift(); placed++; }
  }
  const cycle = p.look === 'brutalist' ? ['b-grid', 'b-fig', 'b-split', 'b-bleed', 'b-plan', 'b-column'] : ['four', 'polaroids-2', 'three', 'collage', 'two-v', 'polaroid-1', 'six', 'big-small'];
  let k = section.pages.length;
  while (queue.length) {
    const one = p.look === 'brutalist' ? 'b-fig' : 'polaroid-1', two = p.look === 'brutalist' ? 'b-split' : 'two-v';
    const lay = queue.length === 1 ? one : queue.length === 2 ? two : cycle[k++ % cycle.length];
    const page = Z.make.page();
    Z.applyLayout(p, page, lay, section);
    for (const el of page.elements) if (el.type === 'photo' && queue.length) { el.photoId = queue.shift(); placed++; }
    page.elements = page.elements.filter((e) => e.type !== 'photo' || e.photoId);
    section.pages.push(page);
  }
  return placed;
};
