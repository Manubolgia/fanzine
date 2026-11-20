# Fanzine Editor

A small editor for making a printed photo zine at home: chapters (one per month), your photos,
layouts, fonts, paper, stickers, tape and drawing, then a PDF that prints with the pages in the
right order for folding and stapling. Everything stays on your computer: photos are never uploaded.

## Open it

Online: **https://manubolgia.github.io/fanzine/** (in Chrome, Edge or Safari). It is an installable
app: on an iPhone use Safari's *Share → Add to Home Screen*, on Android Chrome's *Install app*, on a
computer the install button in Chrome's address bar. After the first visit it works offline.
You can also double-click `index.html` in this folder (no install, no internet; sync needs the online address).

- Your work saves itself on the device you use. Press **Save file** now and then: it writes one
  `.zine` file with the layout and all photos, your backup; **Open** brings it back.
- **Sync** (top bar) keeps the same zine on your computer and your phone, through a private GitHub
  repository of yours. Everything is encrypted on the device with your passphrase before upload,
  so the repository holds only unreadable data. The Sync window explains the one-time setup
  (a token that can use only that repository, and a passphrase you type once per device).
- Tested in Chrome on Linux, including a phone-sized screen with simulated touch. Safari and real
  phones were not tested.

## Make the zine

1. **Pick a size and a look** (the first screen, or **New**):
   - **A6 pocket booklet**, 10.5 × 14.8 cm: A4 sheets, printed on both sides, cut in half,
     folded and stapled. All twelve months in one small book.
   - **Mini zines**, 7.4 × 10.5 cm: the classic one-sheet zine. Each A4 sheet, printed on one
     side, folded and cut once, becomes an 8-page booklet. You get one little book per month.
   - **A5 booklet**, 14.8 × 21 cm: A4 sheets folded in half. The biggest photos.
   - The same three exist for US Letter.
   - **Look**: *Brutalist / architecture magazine* (grotesk and mono type, black rules, giant
     numbers, black-and-white photos) or *Scrapbook / collage* (handwriting, polaroids, tape).
2. **Add photos** (Photos tab, right): pick or drag many at once. Tick *Sort each photo into its
   month* to file them by the date they were taken. iPhone HEIC photos must be JPEG first
   (see the in-app Guide).
3. **Fill pages**: drag a photo onto a frame, click a photo to fill the next empty frame, or press
   **Auto-fill** to place a whole chapter at once.
4. **Try layouts** (Layouts tab): click through templates; your photos follow.
5. **Make it yours**: Add tab (text styles, stickers, rules, tape, torn paper, pen), Page tab
   (paper colour and texture), and the Selected tab for whatever you clicked (filters like hard
   B&W, photocopy, halftone, duotone; borders, torn edges, captions; fonts, size, spacing;
   *Shape* to stretch a word to fill its box, stack lines poster-style, or warp it into an arc,
   bulge, wave, rise or perspective). Double-click a photo to crop it; double-click text to edit it.
6. **📖 Preview** (above the page) to flip through the zine as a book, exactly as it prints.
7. **Export PDF**. Tick *Only the first sheet* for a test print first. The export window shows a
   picture of which page goes where on the paper.

Shortcuts: Ctrl+Z / Ctrl+Shift+Z undo and redo, Delete, Ctrl+D duplicate, Ctrl+C / Ctrl+V copy
to another page, arrows nudge, `[` `]` layer order, V select, T text, P pen, Esc to finish.

## Print and build it

The **Guide** button in the app has the full steps with supplies and troubleshooting. In short:

- **A6 pocket booklet**: print double-sided, *flip on long edge*, *Actual size*. Cut every sheet
  in half across the middle. Fold each half on its own. Nest the top halves (first one outside),
  then put the bottom-half pile inside them. Staple twice through the fold (or sew), then trim the
  three open edges by 4–5 mm with a metal ruler and a sharp craft knife.
- **A5 booklet**: print double-sided, *flip on short edge*, *Actual size*. Fold each sheet, nest
  them with sheet 1 outside, staple, trim.
- **Mini zine**: print on one side. Fold in half both ways and the ends to the middle, cut a slit
  along the middle crease across the two centre panels, fold the long way with the upside-down
  row going to the back, push the ends together and flatten it into a booklet.
- Paper: 100–120 g/m² matte for the inside, 160–200 g/m² card for the cover sheet if your printer
  takes it (the export can put the cover sheet in its own file).

## What's inside

Plain HTML, CSS and JavaScript, no build step and no libraries. The app code is public; your zine and photos never go into it.
`js/sync.js` the encrypted sync, `sw.js` offline support, `js/render.js` draws pages (the same code draws the screen and the PDF), `js/pdf.js` writes the
PDF and places pages on the paper, `js/layouts.js` holds the templates, `js/ui.js` and
`js/editor.js` the interface, `js/guide.js` the printing guide. Fonts are from Google Fonts
(SIL Open Font License / Apache 2.0).
