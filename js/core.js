// Shared namespace, units and small helpers. Every length in a project is in millimetres.
'use strict';
const Z = (window.Z = {});
Z.state = {};

// book: 'fold' = sheets folded once and nested; 'fold2up' = two folded sheets printed on each
// paper sheet, then cut apart; 'mini' = one sheet, one cut, 8 pages, printed on one side.
Z.FORMATS = {
  A6: { w: 105, h: 148.5, paper: 'A4', paperW: 210, paperH: 297, book: 'fold2up', safe: 6, name: 'A6 pocket booklet', size: '10.5 × 14.8 cm', how: 'A4 sheets printed on both sides, cut in half, folded and stapled. Postcard size, all months in one book.' },
  A5: { w: 148.5, h: 210, paper: 'A4', paperW: 297, paperH: 210, book: 'fold', safe: 8, name: 'A5 booklet', size: '14.8 × 21 cm', how: 'A4 sheets printed on both sides, folded in half and stapled. The biggest photos.' },
  MINI: { w: 74.25, h: 105, paper: 'A4', paperW: 297, paperH: 210, book: 'mini', safe: 4, name: 'Mini zines (one sheet each)', size: '7.4 × 10.5 cm', how: 'Each A4 sheet, printed on one side, folded and cut once, makes one 8-page mini zine. Made as one little book per month.' },
  QL: { w: 107.95, h: 139.7, paper: 'Letter', paperW: 215.9, paperH: 279.4, book: 'fold2up', safe: 6, name: 'Quarter-letter pocket booklet', size: '4.25 × 5.5 in', how: 'US Letter sheets printed on both sides, cut in half, folded and stapled.' },
  HL: { w: 139.7, h: 215.9, paper: 'Letter', paperW: 279.4, paperH: 215.9, book: 'fold', safe: 8, name: 'Half-letter booklet', size: '5.5 × 8.5 in', how: 'US Letter sheets printed on both sides, folded in half and stapled.' },
  MINIL: { w: 69.85, h: 107.95, paper: 'Letter', paperW: 279.4, paperH: 215.9, book: 'mini', safe: 4, name: 'Mini zines on US Letter', size: '2.75 × 4.25 in', how: 'Each Letter sheet, printed on one side, folded and cut once, makes one 8-page mini zine.' },
};
for (const f of Object.values(Z.FORMATS)) f.label = `${f.name} (${f.size})`;

Z.PT_TO_MM = 25.4 / 72;
Z.MM_TO_PT = 72 / 25.4;

Z.uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
Z.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
Z.clone = (o) => JSON.parse(JSON.stringify(o));
Z.deg = (r) => (r * 180) / Math.PI;
Z.rad = (d) => (d * Math.PI) / 180;

// Deterministic randomness so torn edges, grain and ransom letters look the same on screen and in the PDF.
Z.hash = (str) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
Z.rng = (seed) => {
  let a = typeof seed === 'string' ? Z.hash(seed) : seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

Z.el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    e.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return e;
};
Z.$ = (sel, root = document) => root.querySelector(sel);
Z.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// phones and small tablets get the one-column layout (see the matching media query in app.css)
Z.phone = () => matchMedia('(max-width: 820px), (max-height: 500px)').matches;

Z.debounce = (fn, ms) => {
  let t = null;
  const d = (...a) => {
    clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn(...a);
    }, ms);
  };
  d.flush = (...a) => {
    if (t) {
      clearTimeout(t);
      t = null;
      fn(...a);
    }
  };
  return d;
};

Z.toast = (msg, ms = 2600) => {
  const box = Z.$('#toasts');
  if (!box) return;
  const t = Z.el('div', { class: 'toast' }, msg);
  box.append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
};

Z.download = (blob, name) => {
  const a = Z.el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 4000);
};

Z.canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};

// Lets the page repaint between heavy steps. A message channel is used because timers are
// slowed to once a second (or less) when the tab is in the background.
Z.yieldUI = () => new Promise((r) => {
  const ch = new MessageChannel();
  ch.port1.onmessage = () => r();
  ch.port2.postMessage(0);
});

// JPEG bytes of a canvas. toDataURL is synchronous, so it is not delayed like toBlob when the
// tab is in the background.
Z.canvasJpeg = (canvas, q) => {
  const b64 = canvas.toDataURL('image/jpeg', q).split(',')[1];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'image/jpeg' });
};

Z.slug = (s) => (s || 'fanzine').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'fanzine';
