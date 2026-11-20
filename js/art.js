// Stickers, paper textures, torn edges and tape: all drawn by code, so they print sharp at 300 dpi.
'use strict';
(() => {
  // --- stickers, in a 100 x 100 box. part modes: 'fill' = fill colour (+ outline if set),
  // 'line' = stroked with the outline colour, 'ink' = filled with the outline colour.
  const star = (n, ro, ri, rot = -Math.PI / 2) => {
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? ri : ro, a = rot + (i * Math.PI) / n;
      d += (i ? 'L' : 'M') + (50 + r * Math.cos(a)).toFixed(2) + ' ' + (50 + r * Math.sin(a)).toFixed(2);
    }
    return d + 'Z';
  };
  const circle = (cx, cy, r) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  const flower = () => {
    let d = '';
    for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; d += circle(50 + 24 * Math.cos(a), 50 + 24 * Math.sin(a), 20); }
    return d;
  };
  const sunRays = () => {
    let d = '';
    for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; d += `M${50 + 32 * Math.cos(a)} ${50 + 32 * Math.sin(a)}L${50 + 46 * Math.cos(a)} ${50 + 46 * Math.sin(a)}`; }
    return d;
  };
  const snow = () => {
    let d = '';
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3, c = Math.cos(a), s = Math.sin(a);
      d += `M50 50L${50 + 45 * c} ${50 + 45 * s}`;
      const bx = 50 + 28 * c, by = 50 + 28 * s;
      for (const k of [-1, 1]) { const b = a + k * 0.7; d += `M${bx} ${by}L${bx + 12 * Math.cos(b)} ${by + 12 * Math.sin(b)}`; }
    }
    return d;
  };
  const stampEdge = () => {
    // scalloped postage-stamp outline
    const p = new Path2D();
    const r = 3.2, n = 10, step = 100 / n;
    p.moveTo(0, 0);
    for (let i = 0; i < n; i++) { p.lineTo(i * step + step / 2 - r, 0); p.arc(i * step + step / 2, 0, r, Math.PI, 0, true); }
    p.lineTo(100, 0);
    for (let i = 0; i < n; i++) { p.lineTo(100, i * step + step / 2 - r); p.arc(100, i * step + step / 2, r, -Math.PI / 2, Math.PI / 2, true); }
    p.lineTo(100, 100);
    for (let i = n - 1; i >= 0; i--) { p.lineTo(i * step + step / 2 + r, 100); p.arc(i * step + step / 2, 100, r, 0, Math.PI, true); }
    p.lineTo(0, 100);
    for (let i = n - 1; i >= 0; i--) { p.lineTo(0, i * step + step / 2 + r); p.arc(0, i * step + step / 2, r, Math.PI / 2, -Math.PI / 2, true); }
    p.closePath();
    return p;
  };

  Z.STICKERS = {
    heart: { name: 'Heart', parts: [['fill', 'M50 88C20 65 5 48 5 30C5 15 17 5 30 5C40 5 47 11 50 18C53 11 60 5 70 5C83 5 95 15 95 30C95 48 80 65 50 88Z']], fill: '#d94f4f' },
    star: { name: 'Star', parts: [['fill', star(5, 48, 20)]], fill: '#f2c14e' },
    sparkle: { name: 'Sparkle', parts: [['fill', 'M50 0C54 35 65 46 100 50C65 54 54 65 50 100C46 65 35 54 0 50C35 46 46 35 50 0Z']], fill: '#f2c14e' },
    burst: { name: 'Burst', parts: [['fill', star(16, 50, 38)]], fill: '#e86a33' },
    circle: { name: 'Circle', parts: [['fill', circle(50, 50, 48)]], fill: '#7fb3d5' },
    square: { name: 'Square', parts: [['fill', 'M2 2H98V98H2Z']], fill: '#2f4858' },
    arch: { name: 'Arch', parts: [['fill', 'M5 98V50A45 45 0 0 1 95 50V98Z']], fill: '#c8553d' },
    flower: { name: 'Flower', parts: [['fill', flower()], ['ink', circle(50, 50, 13)]], fill: '#f4a6b7', stroke: '#f2c14e' },
    sun: { name: 'Sun', parts: [['fill', circle(50, 50, 26)], ['line', sunRays()]], fill: '#f2c14e', stroke: '#e8a33d', sw: 1.2 },
    moon: { name: 'Moon', parts: [['fill', 'M62 6A45 45 0 1 0 94 70A37 37 0 1 1 62 6Z']], fill: '#f1e3a0' },
    cloud: { name: 'Cloud', parts: [['fill', 'M25 80C10 80 2 70 4 58C6 46 18 42 26 45C27 28 42 18 56 22C66 12 86 18 86 36C98 38 100 54 94 64C90 74 82 80 72 80Z']], fill: '#ffffff', stroke: '#222222', sw: 0.6 },
    bolt: { name: 'Lightning', parts: [['fill', 'M58 2L18 56H46L36 98L82 40H54Z']], fill: '#f2c14e' },
    bubble: { name: 'Speech', parts: [['fill', 'M10 8H90Q96 8 96 14V60Q96 66 90 66H42L20 90L25 66H10Q4 66 4 60V14Q4 8 10 8Z']], fill: '#ffffff', stroke: '#222222', sw: 0.6 },
    banner: { name: 'Banner', parts: [['fill', 'M0 25H100L90 50L100 75H0L10 50Z']], fill: '#c8553d' },
    tag: { name: 'Label', parts: [['fill', 'M20 10H96V90H20L2 50Z'], ['ink', circle(20, 50, 5)]], fill: '#f3e9d2', stroke: '#222222', sw: 0.4 },
    stamp: { name: 'Postage stamp', parts: [['fill', stampEdge], ['line', 'M12 12H88V88H12Z']], fill: '#fbf6ea', stroke: '#c8553d', sw: 0.4 },
    envelope: { name: 'Envelope', parts: [['fill', 'M4 20H96V80H4Z'], ['line', 'M4 20L50 55L96 20']], fill: '#f3e9d2', stroke: '#6b4f3a', sw: 0.6 },
    camera: { name: 'Camera', parts: [['fill', 'M8 28H30L36 18H64L70 28H92V84H8Z'], ['line', circle(50, 55, 18)], ['ink', circle(80, 38, 3)]], fill: '#2f4858', stroke: '#f3e9d2', sw: 0.8 },
    note: { name: 'Music note', parts: [['ink', 'M38 20L84 10V66A12 10 0 1 1 76 57V30L46 37V76A12 10 0 1 1 38 67Z']], fill: '#222222', stroke: '#222222' },
    smile: { name: 'Smiley', parts: [['fill', circle(50, 50, 46)], ['ink', circle(35, 40, 5) + circle(65, 40, 5)], ['line', 'M30 60Q50 80 70 60']], fill: '#f2c14e', stroke: '#222222', sw: 1 },
    arrow: { name: 'Arrow', parts: [['fill', 'M4 40H62V20L96 50L62 80V60H4Z']], fill: '#222222' },
    'arrow-hand': { name: 'Drawn arrow', parts: [['line', 'M8 82C26 34 58 22 88 28M70 13L89 28L72 44']], fill: '#222222', stroke: '#222222', sw: 1 },
    'circle-hand': { name: 'Drawn circle', parts: [['line', 'M22 52C20 22 80 14 90 40C98 66 60 90 34 82C8 74 10 40 42 26C58 19 76 22 84 32']], stroke: '#c8553d', sw: 0.9 },
    underline: { name: 'Squiggle', parts: [['line', 'M3 55Q14 35 26 55T50 55T74 55T97 55']], stroke: '#222222', sw: 1 },
    cross: { name: 'X mark', parts: [['line', 'M15 15L85 85M85 15L15 85']], stroke: '#c8553d', sw: 1.4 },
    asterisk: { name: 'Asterisk', parts: [['line', 'M50 6V94M12 28L88 72M88 28L12 72']], stroke: '#222222', sw: 1.2 },
    leaf: { name: 'Leaf', parts: [['fill', 'M10 90C10 40 40 8 92 8C92 60 60 90 10 90Z'], ['line', 'M10 90L70 30']], fill: '#7a9e57', stroke: '#4f6b38', sw: 0.6 },
    tree: { name: 'Xmas tree', parts: [['fill', 'M50 4L80 40H66L88 68H62V92H38V68H12L34 40H20Z']], fill: '#3e7a4f' },
    snowflake: { name: 'Snowflake', parts: [['line', snow()]], stroke: '#7fb3d5', sw: 1 },
    bar: { name: 'Bar / rule', parts: [['fill', 'M0 0H100V100H0Z']], fill: '#111111' },
    frame: { name: 'Frame', parts: [['line', 'M2 2H98V98H2Z']], stroke: '#111111', sw: 0.5 },
    register: { name: 'Register mark', parts: [['line', circle(50, 50, 30) + 'M50 0V100M0 50H100']], stroke: '#111111', sw: 0.3 },
    plus: { name: 'Plus', parts: [['line', 'M50 10V90M10 50H90']], stroke: '#111111', sw: 0.6 },
    'arrow-thin': { name: 'Thin arrow', parts: [['line', 'M2 50H96M80 36L96 50L80 64']], stroke: '#111111', sw: 0.5 },
    disc: { name: 'Dot', parts: [['fill', circle(50, 50, 50)]], fill: '#e0361b' },
    gift: { name: 'Gift', parts: [['fill', 'M10 38H90V94H10Z'], ['fill', 'M4 26H96V40H4Z'], ['ink', 'M44 26H56V94H44Z'], ['line', 'M50 26C40 8 22 10 30 22C34 27 44 26 50 26C56 26 66 27 70 22C78 10 60 8 50 26']], fill: '#c8553d', stroke: '#f2c14e', sw: 0.8 },
  };
  const cache = new Map();
  Z.stickerParts = (kind) => {
    if (cache.has(kind)) return cache.get(kind);
    const def = Z.STICKERS[kind] || Z.STICKERS.heart;
    const parts = def.parts.map(([mode, d]) => ({ mode, path: typeof d === 'function' ? d() : new Path2D(d) }));
    cache.set(kind, parts);
    return parts;
  };

  // --- paper textures: transparent tiles laid over the page colour.
  const TEX = {
    none: { name: 'Plain' },
    recycled: { name: 'Recycled', mm: 50 },
    grain: { name: 'Fine grain', mm: 30 },
    fibers: { name: 'Fibers', mm: 60 },
    kraft: { name: 'Kraft', mm: 50 },
    newsprint: { name: 'Newsprint', mm: 40 },
    crumpled: { name: 'Crumpled', mm: 120 },
    watercolor: { name: 'Watercolour', mm: 110 },
    lined: { name: 'Lined', mm: 7 },
    grid: { name: 'Grid', mm: 5 },
    dots: { name: 'Dot grid', mm: 5 },
  };
  Z.TEXTURES = TEX;
  const tiles = new Map();
  Z.textureTile = (name, pxPerMm) => {
    const def = TEX[name];
    if (!def || !def.mm) return null;
    const ppm = Math.min(pxPerMm, 1400 / def.mm);
    const key = name + '|' + ppm.toFixed(2);
    if (tiles.has(key)) return tiles.get(key);
    const size = Math.max(4, Math.round(def.mm * ppm));
    const c = Z.canvas(size, size);
    const ctx = c.getContext('2d');
    const rnd = Z.rng(name);
    const k = size / def.mm; // px per mm in the tile
    const noise = (amount, dark = true) => {
      const img = ctx.getImageData(0, 0, size, size);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = rnd();
        d[i] = d[i + 1] = d[i + 2] = dark ? 40 : 255;
        d[i + 3] = Math.max(d[i + 3], n * amount);
      }
      ctx.putImageData(img, 0, 0);
    };
    if (name === 'grain' || name === 'newsprint' || name === 'kraft' || name === 'recycled') noise(name === 'newsprint' ? 38 : name === 'kraft' ? 46 : 24);
    if (name === 'recycled' || name === 'kraft') {
      for (let i = 0; i < (name === 'kraft' ? 90 : 140); i++) {
        ctx.fillStyle = rnd() < 0.7 ? 'rgba(60,45,30,0.5)' : 'rgba(120,90,60,0.35)';
        ctx.beginPath();
        ctx.arc(rnd() * size, rnd() * size, (0.08 + rnd() * 0.18) * k, 0, 7);
        ctx.fill();
      }
    }
    if (name === 'fibers' || name === 'kraft') {
      ctx.lineWidth = 0.06 * k;
      for (let i = 0; i < 160; i++) {
        ctx.strokeStyle = rnd() < 0.5 ? 'rgba(90,70,50,0.22)' : 'rgba(255,255,255,0.35)';
        const x = rnd() * size, y = rnd() * size, a = rnd() * 7, l = (1 + rnd() * 4) * k;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.cos(a + 0.6) * l / 2, y + Math.sin(a + 0.6) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l);
        ctx.stroke();
      }
    }
    if (name === 'crumpled') {
      for (let i = 0; i < 26; i++) {
        const x1 = rnd() * size, y1 = rnd() * size, a = rnd() * 7, l = (20 + rnd() * 60) * k;
        const x2 = x1 + Math.cos(a) * l, y2 = y1 + Math.sin(a) * l;
        const nx = -Math.sin(a) * 2.5 * k, ny = Math.cos(a) * 2.5 * k;
        const g = ctx.createLinearGradient(x1 - nx, y1 - ny, x1 + nx, y1 + ny);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.5, 'rgba(0,0,0,0.07)');
        g.addColorStop(0.52, 'rgba(255,255,255,0.18)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x1 - nx, y1 - ny); ctx.lineTo(x2 - nx, y2 - ny); ctx.lineTo(x2 + nx, y2 + ny); ctx.lineTo(x1 + nx, y1 + ny);
        ctx.fill();
      }
      noise(10);
    }
    if (name === 'watercolor') {
      for (let i = 0; i < 18; i++) {
        const x = rnd() * size, y = rnd() * size, r = (10 + rnd() * 30) * k;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const tint = rnd() < 0.5 ? '120,90,60' : '70,90,120';
        g.addColorStop(0, `rgba(${tint},0.05)`);
        g.addColorStop(0.85, `rgba(${tint},0.08)`);
        g.addColorStop(1, `rgba(${tint},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
      }
    }
    if (name === 'lined') {
      ctx.fillStyle = 'rgba(70,110,170,0.45)';
      ctx.fillRect(0, size - 0.18 * k, size, 0.18 * k);
    }
    if (name === 'grid') {
      ctx.fillStyle = 'rgba(70,110,170,0.35)';
      ctx.fillRect(0, size - 0.12 * k, size, 0.12 * k);
      ctx.fillRect(size - 0.12 * k, 0, 0.12 * k, size);
    }
    if (name === 'dots') {
      ctx.fillStyle = 'rgba(60,60,60,0.45)';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 0.2 * k, 0, 7);
      ctx.fill();
    }
    const out = { canvas: c, ppm: size / def.mm };
    tiles.set(key, out);
    return out;
  };
  Z.texturePattern = (ctx, name, pxPerMm) => {
    const t = Z.textureTile(name, pxPerMm);
    if (!t) return null;
    const pat = ctx.createPattern(t.canvas, 'repeat');
    pat.setTransform(new DOMMatrix().scale(1 / t.ppm));
    return pat;
  };

  // --- torn / deckled outline of a w x h rectangle centred on 0,0 (mm)
  Z.edgePath = (w, h, seed, kind) => {
    const p = new Path2D();
    if (kind === 'rounded') {
      const r = Math.min(w, h) * 0.06;
      p.roundRect(-w / 2, -h / 2, w, h, r);
      return p;
    }
    if (kind !== 'torn' && kind !== 'deckle') {
      p.rect(-w / 2, -h / 2, w, h);
      return p;
    }
    const rnd = Z.rng(seed);
    const amp = kind === 'torn' ? Math.min(1.1, Math.min(w, h) * 0.05) : 0.35;
    const step = kind === 'torn' ? 1.3 : 0.7;
    const corners = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    let first = true;
    let drift = 0;
    for (let e = 0; e < 4; e++) {
      const [x1, y1] = corners[e], [x2, y2] = corners[(e + 1) % 4];
      const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.round(len / step));
      const nx = (y2 - y1) / len, ny = -(x2 - x1) / len; // outward normal
      for (let i = 0; i < n; i++) {
        const t = i / n;
        drift = drift * 0.6 + (rnd() - 0.5) * amp;
        const j = (rnd() - 0.5) * amp * 0.6 + drift;
        const x = x1 + (x2 - x1) * t + nx * j, y = y1 + (y2 - y1) * t + ny * j;
        if (first) { p.moveTo(x, y); first = false; } else p.lineTo(x, y);
      }
    }
    p.closePath();
    return p;
  };

  // washi / masking tape with zig-zag torn ends
  Z.tapePath = (w, h, seed) => {
    const rnd = Z.rng(seed);
    const p = new Path2D();
    const teeth = Math.max(3, Math.round(h / 1.4));
    p.moveTo(-w / 2, -h / 2);
    p.lineTo(w / 2, -h / 2);
    for (let i = 1; i <= teeth; i++) p.lineTo(w / 2 + (i % 2 ? -1 : 0) * (0.5 + rnd() * 0.9), -h / 2 + (h * i) / teeth);
    p.lineTo(-w / 2, h / 2);
    for (let i = teeth - 1; i >= 0; i--) p.lineTo(-w / 2 + (i % 2 ? 1 : 0) * (0.5 + rnd() * 0.9), -h / 2 + (h * i) / teeth);
    p.closePath();
    return p;
  };

  Z.SWATCHES = ['#222222', '#ffffff', '#f7f2e8', '#efe4cf', '#c9a27a', '#c8553d', '#e86a33', '#f2c14e', '#f4a6b7', '#d94f4f', '#7a9e57', '#3e7a4f', '#7fb3d5', '#1f3a5f', '#2f4858', '#6d5a8c'];
  Z.PAPERS = [
    { name: 'Off-white', color: '#f4f3ef', texture: 'none' },
    { name: 'Concrete', color: '#d6d4cf', texture: 'grain' },
    { name: 'Cream', color: '#f7f2e8', texture: 'fibers' },
    { name: 'White', color: '#ffffff', texture: 'none' },
    { name: 'Recycled', color: '#ece6d8', texture: 'recycled' },
    { name: 'Kraft', color: '#c9a27a', texture: 'kraft' },
    { name: 'Newsprint', color: '#e9e5dc', texture: 'newsprint' },
    { name: 'Notebook', color: '#fbfaf5', texture: 'lined' },
    { name: 'Graph', color: '#f8f9f4', texture: 'grid' },
    { name: 'Crumpled', color: '#f3eee4', texture: 'crumpled' },
    { name: 'Watercolour', color: '#f6f1e6', texture: 'watercolor' },
    { name: 'Blush', color: '#f4dcd6', texture: 'grain' },
    { name: 'Sage', color: '#dfe5d3', texture: 'grain' },
    { name: 'Night', color: '#1f2733', texture: 'grain' },
    { name: 'Ink black', color: '#141414', texture: 'grain' },
  ];
})();
