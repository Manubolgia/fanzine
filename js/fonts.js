// The font menu. The files live in fonts/ (see fonts/fonts.css); if a font is missing the browser
// falls back to the system font named in `fallback`, so the editor still works.
'use strict';
Z.FONTS = [
  // handwriting
  { f: 'Caveat', cat: 'Handwritten', fallback: 'cursive' },
  { f: 'Indie Flower', cat: 'Handwritten', fallback: 'cursive' },
  { f: 'Homemade Apple', cat: 'Handwritten', fallback: 'cursive' },
  { f: 'Reenie Beanie', cat: 'Handwritten', fallback: 'cursive' },
  { f: 'Shadows Into Light', cat: 'Handwritten', fallback: 'cursive' },
  { f: 'Gochi Hand', cat: 'Handwritten', fallback: 'cursive' },
  { f: 'Kalam', cat: 'Handwritten', fallback: 'cursive' },
  { f: 'Patrick Hand', cat: 'Handwritten', fallback: 'cursive' },
  { f: 'Nothing You Could Do', cat: 'Handwritten', fallback: 'cursive' },
  { f: 'Covered By Your Grace', cat: 'Handwritten', fallback: 'cursive' },
  { f: 'Rock Salt', cat: 'Handwritten', fallback: 'cursive' },
  { f: 'Permanent Marker', cat: 'Handwritten', fallback: 'cursive' },
  { f: 'Dancing Script', cat: 'Script', fallback: 'cursive' },
  { f: 'Sacramento', cat: 'Script', fallback: 'cursive' },
  { f: 'Pacifico', cat: 'Script', fallback: 'cursive' },
  { f: 'Lobster', cat: 'Script', fallback: 'cursive' },
  // typewriter
  { f: 'Special Elite', cat: 'Typewriter', fallback: 'monospace' },
  { f: 'Courier Prime', cat: 'Typewriter', fallback: 'monospace' },
  { f: 'Cutive Mono', cat: 'Typewriter', fallback: 'monospace' },
  { f: 'Space Mono', cat: 'Mono', fallback: 'monospace' },
  // serif
  { f: 'Playfair Display', cat: 'Serif', fallback: 'serif' },
  { f: 'DM Serif Display', cat: 'Serif', fallback: 'serif' },
  { f: 'Libre Baskerville', cat: 'Serif', fallback: 'serif' },
  { f: 'EB Garamond', cat: 'Serif', fallback: 'serif' },
  { f: 'Cormorant Garamond', cat: 'Serif', fallback: 'serif' },
  { f: 'Abril Fatface', cat: 'Serif', fallback: 'serif' },
  // display
  { f: 'Bebas Neue', cat: 'Condensed', fallback: 'sans-serif' },
  { f: 'Anton', cat: 'Condensed', fallback: 'sans-serif' },
  { f: 'Archivo Black', cat: 'Display', fallback: 'sans-serif' },
  { f: 'Staatliches', cat: 'Display', fallback: 'sans-serif' },
  { f: 'Bungee', cat: 'Display', fallback: 'sans-serif' },
  { f: 'Bungee Shade', cat: 'Display', fallback: 'sans-serif' },
  { f: 'Monoton', cat: 'Display', fallback: 'sans-serif' },
  { f: 'Shrikhand', cat: 'Display', fallback: 'serif' },
  { f: 'Rye', cat: 'Display', fallback: 'serif' },
  { f: 'Ultra', cat: 'Display', fallback: 'serif' },
  { f: 'Righteous', cat: 'Display', fallback: 'sans-serif' },
  { f: 'Rubik Mono One', cat: 'Display', fallback: 'sans-serif' },
  { f: 'Rubik Dirt', cat: 'Display', fallback: 'sans-serif' },
  // grotesk, condensed, mono, editorial serif: the architecture-magazine set
  { f: 'Archivo', cat: 'Grotesk', fallback: 'sans-serif' },
  { f: 'Inter Tight', cat: 'Grotesk', fallback: 'sans-serif' },
  { f: 'Archivo Narrow', cat: 'Grotesk', fallback: 'sans-serif' },
  { f: 'IBM Plex Sans Condensed', cat: 'Grotesk', fallback: 'sans-serif' },
  { f: 'Bricolage Grotesque', cat: 'Grotesk', fallback: 'sans-serif' },
  { f: 'Syne', cat: 'Grotesk', fallback: 'sans-serif' },
  { f: 'Unbounded', cat: 'Grotesk', fallback: 'sans-serif' },
  { f: 'Space Grotesk', cat: 'Grotesk', fallback: 'sans-serif' },
  { f: 'Work Sans', cat: 'Grotesk', fallback: 'sans-serif' },
  { f: 'Big Shoulders Display', cat: 'Condensed', fallback: 'sans-serif' },
  { f: 'Oswald', cat: 'Condensed', fallback: 'sans-serif' },
  { f: 'League Gothic', cat: 'Condensed', fallback: 'sans-serif' },
  { f: 'Six Caps', cat: 'Condensed', fallback: 'sans-serif' },
  { f: 'IBM Plex Mono', cat: 'Mono', fallback: 'monospace' },
  { f: 'JetBrains Mono', cat: 'Mono', fallback: 'monospace' },
  { f: 'Instrument Serif', cat: 'Serif', fallback: 'serif' },
  { f: 'Newsreader', cat: 'Serif', fallback: 'serif' },
];
const CAT_ORDER = ['Grotesk', 'Condensed', 'Mono', 'Serif', 'Display', 'Typewriter', 'Handwritten', 'Script'];
Z.FONTS.sort((a, b) => CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat));
Z.FONT_BY_NAME = Object.fromEntries(Z.FONTS.map((x) => [x.f, x]));
Z.RANSOM_FONTS = ['Anton', 'Abril Fatface', 'Bungee', 'Special Elite', 'Playfair Display', 'Rye', 'Archivo Black', 'Courier Prime', 'Permanent Marker', 'Ultra', 'Staatliches', 'Libre Baskerville'];

Z.fontStack = (name) => {
  const def = Z.FONT_BY_NAME[name];
  return `"${name}", ${def ? def.fallback : 'sans-serif'}`;
};

Z.fontsReady = (async () => {
  if (!document.fonts) return;
  const loads = [];
  for (const { f } of Z.FONTS) {
    loads.push(document.fonts.load(`32px "${f}"`).catch(() => null));
    loads.push(document.fonts.load(`bold 32px "${f}"`).catch(() => null));
  }
  await Promise.all(loads);
  Z.FONTS.forEach((x) => (x.ok = document.fonts.check(`32px "${x.f}"`) && [...document.fonts].some((ff) => ff.family.replace(/"/g, '') === x.f && ff.status === 'loaded')));
})();
