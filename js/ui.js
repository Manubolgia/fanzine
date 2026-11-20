// Panels: chapters and pages on the left, tools on the right, the page bar, dialogs.
'use strict';
Z.ui = (() => {
  const S = Z.state;
  const $ = Z.$, el = Z.el;
  let tab = 'photos';
  let trayFilter = 'current';
  let sortByDate = false;
  let fontCat = 'All';
  const thumbs = new Map();
  const P = () => S.project;

  // ---------- small control builders
  const row = (label, ...kids) => el('div', { class: 'row' }, el('label', {}, label), el('div', { class: 'ctl' }, ...kids));
  const slider = (label, get, set, min, max, step = 1, unit = '') => {
    const out = el('span', { class: 'val' }, fmt(get(), step) + unit);
    const inp = el('input', { type: 'range', min, max, step, value: get() });
    inp.addEventListener('input', () => { set(+inp.value); out.textContent = fmt(+inp.value, step) + unit; Z.changed(false); });
    inp.addEventListener('change', () => Z.changed(true));
    return row(label, inp, out);
  };
  const fmt = (v, step) => (step < 1 ? (+v).toFixed(step < 0.1 ? 2 : 1) : Math.round(v));
  const colors = (get, set, opts = {}) => {
    const wrap = el('div', { class: 'swatches' });
    if (opts.none) wrap.append(el('button', { class: 'sw none' + (!get() ? ' on' : ''), title: 'None', onclick: () => { set(''); Z.changed(true); rebuild(); } }, '∅'));
    for (const c of opts.list || Z.SWATCHES) wrap.append(el('button', { class: 'sw' + (get() === c ? ' on' : ''), style: { background: c }, title: c, onclick: () => { set(c); Z.changed(true); rebuild(); } }));
    const pick = el('input', { type: 'color', value: get() || '#000000', title: 'Any colour' });
    pick.addEventListener('input', () => { set(pick.value); Z.changed(false); });
    pick.addEventListener('change', () => { Z.changed(true); rebuild(); });
    wrap.append(pick);
    return wrap;
  };
  const seg = (options, get, set) => el('div', { class: 'seg' }, options.map(([v, label, title]) => el('button', { class: get() === v ? 'on' : '', title: title || '', onclick: () => { set(v); Z.changed(true); rebuild(); } }, label)));
  const check = (label, get, set) => {
    const c = el('input', { type: 'checkbox' });
    c.checked = !!get();
    c.addEventListener('change', () => { set(c.checked); Z.changed(true); rebuild(); });
    return el('label', { class: 'check' }, c, ' ', label);
  };
  const btn = (label, onclick, cls = '') => el('button', { class: 'btn ' + cls, onclick }, label);
  const h = (t) => el('h3', {}, t);
  const note = (t) => el('p', { class: 'note' }, t);
  const rebuild = () => renderPanel();

  // ---------- init
  function init() {
    $('#title').addEventListener('input', (e) => { P().title = e.target.value; Z.changed(false); });
    $('#undoBtn').onclick = () => Z.history.undo();
    $('#redoBtn').onclick = () => Z.history.redo();
    Z.$$('[data-tool]').forEach((b) => (b.onclick = () => Z.setTool(b.dataset.tool)));
    $('#zoomIn').onclick = () => Z.setZoom(S.zoom * 1.2);
    $('#zoomOut').onclick = () => Z.setZoom(S.zoom / 1.2);
    $('#zoomFit').onclick = () => Z.setZoom(1);
    $('#guidesBtn').onclick = () => { P().settings.guides = !P().settings.guides; Z.changed(true); topToggles(); };
    $('#snapBtn').onclick = () => { P().settings.snap = !P().settings.snap; Z.changed(true); topToggles(); };
    $('#saveBtn').onclick = () => saveFile();
    $('#openBtn').onclick = () => $('#openFile').click();
    $('#openFile').addEventListener('change', openFile);
    $('#exportBtn').onclick = () => openExport();
    $('#guideBtn').onclick = () => openGuide();
    $('#newBtn').onclick = () => openNew(false);
    $('#addChapter').onclick = () => addSection('chapter');
    $('#addExtra').onclick = () => addSection('extra');
    $('#importFile').addEventListener('change', async (e) => { await importFiles([...e.target.files]); e.target.value = ''; });
    Z.$$('#tabs button').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; renderPanel(); }));
    Z.$$('.modal').forEach((m) => m.addEventListener('pointerdown', (e) => { if (e.target === m) closeModals(); }));
    Z.$$('[data-close]').forEach((b) => (b.onclick = closeModals));
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());
  }
  function topToggles() {
    $('#guidesBtn').classList.toggle('on', !!P().settings.guides);
    $('#snapBtn').classList.toggle('on', !!P().settings.snap);
  }

  function refreshAll() {
    $('#title').value = P().title;
    topToggles();
    renderSections();
    renderPageBar();
    renderPanel();
    updateThumbs();
  }
  const updateThumbsSoon = Z.debounce(() => updateThumbs(), 500);
  function refreshLight() {
    renderPageBar();
    updateThumbsSoon();
  }
  Z.onRendered = () => updateThumbsSoon();

  // ---------- left: sections and page thumbnails
  function sectionCounts(s) {
    const n = P().photos.filter((x) => x.sectionId === s.id).length;
    return `${s.pages.length} page${s.pages.length === 1 ? '' : 's'}` + (n ? ` · ${n} photo${n === 1 ? '' : 's'}` : '');
  }
  function renderSections() {
    const box = $('#sections');
    box.innerHTML = '';
    const flat = Z.flat(P());
    const indexOf = new Map(flat.map((e, i) => [e.page.id, i]));
    const tile = (page, i, pad) => {
      const t = thumbs.get(page.id) || { key: '', canvas: Z.canvas(10, 10) };
      thumbs.set(page.id, t);
      const d = el('div', { class: 'thumb' + (i === S.cur ? ' cur' : '') + (pad ? ' pad' : ''), title: Z.pageLabel(flat[i]), onclick: () => goTo(i) }, t.canvas, el('span', { class: 'pno' }, String(i + 1)));
      return d;
    };
    const sections = P().sections;
    sections.forEach((s, si) => {
      const movable = s.type === 'chapter' || s.type === 'extra';
      const head = el('div', { class: 'sec-head' },
        el('div', { class: 'sec-name', title: movable ? 'Double-click to rename' : '', ondblclick: () => movable && renameSection(s) }, s.name),
        el('div', { class: 'sec-meta' }, sectionCounts(s)),
        movable ? el('div', { class: 'sec-tools' },
          el('button', { title: 'Rename', onclick: () => renameSection(s) }, '✎'),
          el('button', { title: 'Move up', onclick: () => moveSection(s, -1) }, '↑'),
          el('button', { title: 'Move down', onclick: () => moveSection(s, 1) }, '↓'),
          el('button', { title: 'Add a page to the end of this section', onclick: () => addPage(s) }, '+'),
          el('button', { title: 'Delete this section', onclick: () => deleteSection(s) }, '✕')) : null);
      head.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('application/x-zine-photo')) { e.preventDefault(); head.classList.add('drop'); } });
      head.addEventListener('dragleave', () => head.classList.remove('drop'));
      head.addEventListener('drop', (e) => {
        head.classList.remove('drop');
        const id = e.dataTransfer.getData('application/x-zine-photo');
        const rec = id && Z.findPhoto(P(), id);
        if (rec) { e.preventDefault(); e.stopPropagation(); rec.sectionId = s.id; Z.changed(true); renderSections(); renderPanel(); Z.toast(`Moved to ${s.name}`); }
      });
      const myPads = Z.isMini(P()) ? flat.filter((e) => e.pad && e.padSection === s) : [];
      const pages = el('div', { class: 'sec-pages' }, s.pages.map((pg) => tile(pg, indexOf.get(pg.id), false)), myPads.map((e) => tile(e.page, indexOf.get(e.page.id), true)));
      box.append(el('div', { class: 'sec' + (s.type === 'chapter' ? ' chapter' : '') }, head, pages));
      const next = sections[si + 1];
      if (!Z.isMini(P()) && next && next.type === 'back') {
        const pads = flat.filter((e) => e.pad);
        if (pads.length) {
          box.append(el('div', { class: 'sec padsec' },
            el('div', { class: 'sec-head' }, el('div', { class: 'sec-name' }, 'Blank pages'), el('div', { class: 'sec-meta' }, `${pads.length} added so the page count is a multiple of 4`)),
            el('div', { class: 'sec-pages' }, pads.map((e) => tile(e.page, indexOf.get(e.page.id), true)))));
        }
      }
    });
    const total = flat.length;
    $('#leftSummary').textContent = `${total} pages · ` + paperCount(total);
  }
  // how much paper a zine of n pages takes, in plain words
  function paperCount(n) {
    const f = Z.pageSize(P());
    if (f.book === 'mini') return `${n / 8} mini zine${n / 8 === 1 ? '' : 's'}, one ${f.paper} sheet each`;
    const sheets = n / 4;
    if (f.book === 'fold2up') { const paper = Math.ceil(sheets / 2); return `${sheets} folded sheets = ${paper} sheet${paper === 1 ? '' : 's'} of ${f.paper} cut in half`; }
    return `${sheets} sheet${sheets === 1 ? '' : 's'} of ${f.paper}`;
  }
  Z.paperCount = (n) => paperCount(n);
  function updateThumbs() {
    const flat = Z.flat(P());
    const { w: W, h: H } = Z.pageSize(P());
    const dpr = window.devicePixelRatio || 1;
    const ppm = (78 / W) * dpr;
    flat.forEach((entry, i) => {
      const t = thumbs.get(entry.page.id);
      if (!t) return;
      const { facing, facingDx } = Z.pageEntryFacing(flat, i);
      const key = Z.photos.version + '|' + JSON.stringify(entry.page) + (facing ? JSON.stringify(facing.elements) : '');
      if (t.key === key) return;
      t.key = key;
      t.canvas.width = Math.round(W * ppm);
      t.canvas.height = Math.round(H * ppm);
      const ctx = t.canvas.getContext('2d');
      Z.renderPage(ctx, entry.page, { ppm, x0: 0, y0: 0, project: P(), facing, facingDx, editor: true });
    });
    Z$$cur();
  }
  function Z$$cur() {
    Z.$$('#sections .thumb').forEach((d) => d.classList.toggle('cur', +d.querySelector('.pno').textContent - 1 === S.cur));
  }

  function goTo(i) {
    S.cur = i;
    S.sel = [];
    S.cropId = null;
    pageChanged();
    selectionChanged();
    Z.requestRender();
  }
  function goSpread(d) {
    const flat = Z.flat(P());
    const bl = Z.bookLen(P(), flat.length);
    const sps = Z.spreads(flat.length, bl);
    const k = Z.clamp(Z.spreadOf(flat.length, S.cur, bl) + d, 0, sps.length - 1);
    goTo(sps[k].find((x) => x != null));
  }
  function pageChanged() {
    renderPageBar();
    Z$$cur();
    if (tab === 'layouts' || tab === 'page' || (tab === 'photos' && trayFilter === 'current')) renderPanel();
    const cur = $('#sections .thumb.cur');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }

  function renameSection(s) {
    const name = prompt('Name of this section', s.name);
    if (!name || name === s.name) return;
    // keep chapter titles on the opener in step with the name
    for (const pg of s.pages) for (const e of pg.elements) if (e.type === 'text' && e.text === s.name) e.text = name;
    s.name = name;
    Z.changed(true);
    renderSections();
    renderPageBar();
  }
  function moveSection(s, d) {
    const arr = P().sections, i = arr.indexOf(s), j = i + d;
    if (j < 0 || j >= arr.length || arr[j].type === 'cover' || arr[j].type === 'back') return;
    arr.splice(i, 1);
    arr.splice(j, 0, s);
    S.cur = Z.flat(P()).findIndex((e) => e.page === s.pages[0]);
    Z.changed(true);
    renderSections();
    renderPageBar();
  }
  function addSection(type) {
    const name = prompt(type === 'chapter' ? 'Chapter name' : 'Section name (for example: Letters, Notes, Extras)', type === 'chapter' ? 'New chapter' : 'Extras');
    if (!name) return;
    const s = { id: Z.uid(), type, name, pages: [Z.make.page()] };
    const arr = P().sections;
    const hasBack = arr.length && arr[arr.length - 1].type === 'back';
    arr.splice(hasBack ? arr.length - 1 : arr.length, 0, s);
    Z.applyLayout(P(), s.pages[0], type === 'chapter' ? 'opener-classic' : 'blank', s);
    S.cur = Z.flat(P()).findIndex((e) => e.page === s.pages[0]);
    Z.changed(true);
    renderSections();
    renderPageBar();
    Z.requestRender();
  }
  function deleteSection(s) {
    const n = P().photos.filter((x) => x.sectionId === s.id).length;
    if (!confirm(`Delete "${s.name}" and its ${s.pages.length} page(s)?` + (n ? ` Its ${n} photo(s) stay in your library, under "Not in a chapter".` : '') + ' (You can undo this.)')) return;
    P().sections = P().sections.filter((x) => x !== s);
    P().photos.forEach((x) => { if (x.sectionId === s.id) x.sectionId = null; });
    S.cur = Math.min(S.cur, Z.flat(P()).length - 1);
    S.sel = [];
    Z.changed(true);
    refreshAll();
    Z.requestRender();
  }
  function addPage(s, after) {
    const pg = Z.make.page({ bg: after ? Z.clone(after.bg) : { color: P().settings.paper || Z.PAPER, texture: 'none', tex: 0.6 } });
    Z.applyLayout(P(), pg, 'two-v', s);
    const i = after ? s.pages.indexOf(after) + 1 : s.pages.length;
    s.pages.splice(i, 0, pg);
    S.cur = Z.flat(P()).findIndex((e) => e.page === pg);
    S.sel = [];
    Z.changed(true);
    renderSections();
    renderPageBar();
    Z.requestRender();
  }

  // ---------- page bar above the workspace
  function renderPageBar() {
    const bar = $('#pagebar');
    const flat = Z.flat(P());
    const e = flat[S.cur];
    if (!e) return;
    bar.innerHTML = '';
    bar.append(el('button', { class: 'btn icon', title: 'Previous spread (PageUp)', onclick: () => goSpread(-1) }, '◀'),
      el('span', { class: 'where' }, Z.isMini(P()) ? `Mini zine ${e.book + 1} of ${flat.length / 8}, page ${e.bn} of 8` : `Page ${S.cur + 1} of ${flat.length}`, el('b', {}, ' · ' + (e.pad ? 'blank page' : e.section.name))),
      el('button', { class: 'btn icon', title: 'Next spread (PageDown)', onclick: () => goSpread(1) }, '▶'));
    const actions = el('div', { class: 'pageacts' });
    if (e.pad) {
      actions.append(btn('Design this page', () => addPage(e.padSection), 'primary'));
    } else if (e.section.type === 'chapter' || e.section.type === 'extra') {
      const s = e.section, i = s.pages.indexOf(e.page);
      actions.append(
        btn('+ Page after', () => addPage(s, e.page)),
        btn('Duplicate', () => {
          const c = Z.clone(e.page);
          c.id = Z.uid();
          c.elements.forEach((x) => (x.id = Z.uid()));
          s.pages.splice(i + 1, 0, c);
          S.cur++;
          Z.changed(true); renderSections(); renderPageBar(); Z.requestRender();
        }),
        btn('◀ Move', () => movePage(s, e.page, -1)),
        btn('Move ▶', () => movePage(s, e.page, 1)),
        btn('Delete page', () => {
          if (s.pages.length === 1) return Z.toast('A section needs at least one page. To remove the whole section, use ✕ next to its name.', 4000);
          s.pages.splice(i, 1);
          S.sel = [];
          S.cur = Math.max(0, S.cur - 1);
          Z.changed(true); renderSections(); renderPageBar(); Z.requestRender();
        }, 'danger'));
    }
    bar.append(actions);
  }
  function movePage(s, page, d) {
    const secs = P().sections;
    const i = s.pages.indexOf(page);
    const j = i + d;
    if (j >= 0 && j < s.pages.length) {
      s.pages.splice(i, 1);
      s.pages.splice(j, 0, page);
    } else {
      // across into the neighbouring chapter
      const k = secs.indexOf(s) + d;
      const t = secs[k];
      if (!t || t.type === 'cover' || t.type === 'back' || s.pages.length === 1) return;
      s.pages.splice(i, 1);
      if (d < 0) t.pages.push(page); else t.pages.unshift(page);
    }
    S.cur = Z.flat(P()).findIndex((e) => e.page === page);
    Z.changed(true);
    renderSections();
    renderPageBar();
    Z.requestRender();
  }

  // ---------- right panel
  function renderPanel() {
    if (tab === 'sel' && !S.sel.length) tab = 'photos';
    Z.$$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    $('#tabs [data-tab=sel]').disabled = !S.sel.length;
    const box = $('#panel');
    const scroll = box.scrollTop;
    box.innerHTML = '';
    const build = { photos: panelPhotos, layouts: panelLayouts, add: panelAdd, page: panelPage, sel: panelSel }[tab];
    build(box);
    box.scrollTop = scroll;
  }
  function selectionChanged() {
    if (S.sel.length && tab !== 'sel') tab = 'sel';
    if (!S.sel.length && tab === 'sel') tab = S.tool === 'draw' ? 'add' : 'photos';
    renderPanel();
    renderPageBar();
  }

  // photos tab
  function currentSection() {
    const e = Z.flat(P())[S.cur];
    return e && e.section && !e.pad ? e.section : null;
  }
  function panelPhotos(box) {
    const cs = currentSection();
    const sel = el('select', {}, el('option', { value: 'current' }, `This page's section${cs ? ' (' + cs.name + ')' : ''}`), el('option', { value: 'all' }, 'All photos'), el('option', { value: 'none' }, 'Not in a chapter'),
      P().sections.map((s) => el('option', { value: s.id }, s.name)));
    sel.value = trayFilter;
    sel.onchange = () => { trayFilter = sel.value; renderPanel(); };
    const target = trayFilter === 'current' ? cs : P().sections.find((s) => s.id === trayFilter);
    const date = el('input', { type: 'checkbox' });
    date.checked = sortByDate;
    date.onchange = () => (sortByDate = date.checked);
    box.append(h('Photo tray'), row('Show', sel),
      el('div', { class: 'importbox', id: 'importBox' },
        btn('Add photos…', () => $('#importFile').click(), 'primary'),
        el('div', { class: 'note' }, `or drag them here from your computer. They go to ${target ? '“' + target.name + '”' : 'no chapter'}.`),
        el('label', { class: 'check' }, date, ' Sort each photo into its month by the date it was taken')));
    const ib = $('#importBox', box);
    ib.addEventListener('dragover', (e) => { e.preventDefault(); ib.classList.add('drop'); });
    ib.addEventListener('dragleave', () => ib.classList.remove('drop'));
    ib.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); ib.classList.remove('drop'); if (e.dataTransfer.files.length) importFiles([...e.dataTransfer.files]); });
    box.append(el('div', { id: 'importProgress', class: 'note' }));
    const use = Z.photoUse(P());
    let list = P().photos;
    if (trayFilter === 'current') list = cs ? list.filter((x) => x.sectionId === cs.id) : [];
    else if (trayFilter === 'none') list = list.filter((x) => !x.sectionId || !P().sections.some((s) => s.id === x.sectionId));
    else if (trayFilter !== 'all') list = list.filter((x) => x.sectionId === trayFilter);
    const placed = list.filter((x) => use.has(x.id)).length;
    box.append(el('div', { class: 'note' }, `${list.length} photo${list.length === 1 ? '' : 's'}, ${placed} placed. Drag one onto a frame or the page, or click it to fill the next empty frame. Drag one onto a chapter name on the left to move it there.`));
    if (target && target.type === 'chapter' || (target && target.type === 'extra')) {
      const unused = list.filter((x) => !use.has(x.id)).length;
      if (unused) box.append(btn(`Auto-fill “${target.name}” with its ${unused} unplaced photo${unused === 1 ? '' : 's'}`, () => {
        const n = Z.autoFill(P(), target);
        Z.changed(true); renderSections(); renderPanel(); Z.requestRender();
        Z.toast(`Placed ${n} photos. Try other layouts on each page in the Layouts tab.`, 4000);
      }));
    }
    const grid = el('div', { class: 'tray' });
    for (const ph of list) {
      const img = el('img', { alt: ph.name, draggable: 'false' });
      Z.photos.thumbURL(ph.id).then((u) => (img.src = u));
      const sec = P().sections.find((s) => s.id === ph.sectionId);
      const card = el('div', { class: 'ph' + (use.has(ph.id) ? ' used' : ''), draggable: 'true', title: ph.name + (ph.date ? ' · ' + new Date(ph.date).toLocaleDateString() : '') + (sec ? ' · ' + sec.name : ''), onclick: () => Z.placePhoto(ph.id) },
        img, use.has(ph.id) ? el('span', { class: 'badge' }, '✓' + (use.get(ph.id) > 1 ? use.get(ph.id) : '')) : null,
        trayFilter === 'all' && sec ? el('span', { class: 'secname' }, sec.name) : null,
        el('button', { class: 'del', title: 'Remove from the zine', onclick: (e) => { e.stopPropagation(); removePhoto(ph); } }, '✕'));
      card.addEventListener('dragstart', (e) => { e.dataTransfer.setData('application/x-zine-photo', ph.id); e.dataTransfer.effectAllowed = 'copy'; });
      grid.append(card);
    }
    box.append(grid);
  }
  function removePhoto(ph) {
    const n = Z.photoUse(P()).get(ph.id) || 0;
    if (!confirm(`Remove “${ph.name}” from this zine?` + (n ? ` It is on ${n} page(s); those frames become empty.` : '') + ' (Your original file is not touched.)')) return;
    P().photos = P().photos.filter((x) => x !== ph);
    for (const s of P().sections) for (const pg of s.pages) {
      for (const e of pg.elements) if (e.photoId === ph.id) e.photoId = null;
      pg.spare = (pg.spare || []).filter((x) => x.photoId !== ph.id);
    }
    Z.changed(true);
    renderPanel();
    renderSections();
  }
  async function importFiles(files) {
    files = files.filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(f.name));
    if (!files.length) return [];
    const cs = trayFilter === 'current' ? currentSection() : P().sections.find((s) => s.id === trayFilter) || null;
    const prog = $('#importProgress');
    const { added, failed } = await Z.photos.importFiles(P(), files, cs ? cs.id : null, sortByDate, (i, n, name) => {
      const p = $('#importProgress');
      if (p) p.textContent = `Adding ${i} of ${n}: ${name}`;
    });
    P().photos.push(...added);
    if ($('#importProgress')) $('#importProgress').textContent = '';
    Z.changed(true);
    renderPanel();
    renderSections();
    if (added.length) Z.toast(`Added ${added.length} photo${added.length === 1 ? '' : 's'}.`);
    if (failed.length) Z.toast(`Couldn't open ${failed.length} file(s): ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '…' : ''}. iPhone HEIC photos need converting to JPEG first (see the Guide).`, 8000);
    return added;
  }

  // layouts tab
  function layoutPreview(id) {
    const { w: W, h: H } = Z.pageSize(P());
    const k = 54 / H;
    const c = Z.canvas(W * k * 2, H * k * 2);
    const x = c.getContext('2d');
    x.scale(k * 2, k * 2);
    x.fillStyle = '#fbf8f2';
    x.fillRect(0, 0, W, H);
    for (const s of Z.LAYOUTS[id].make(W, H, P().settings.safe)) {
      x.save();
      if (s.kind === 'photo') {
        x.translate(s.x + s.w / 2, s.y + s.h / 2);
        x.rotate(Z.rad(s.rot || 0));
        x.fillStyle = s.style === 'polaroid' ? '#ffffff' : '#9c8f80';
        x.strokeStyle = '#7d7062';
        x.lineWidth = 0.8;
        x.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
        x.strokeRect(-s.w / 2, -s.h / 2, s.w, s.h);
        if (s.style === 'polaroid') { x.fillStyle = '#9c8f80'; x.fillRect(-s.w / 2 + s.w * 0.055, -s.h / 2 + s.w * 0.055, s.w * 0.89, s.h - s.w * 0.255); }
      } else if (s.kind === 'shape') {
        x.fillStyle = '#222';
        if (s.shape === 'bar') x.fillRect(s.x, s.y, s.w, Math.max(s.h, 0.8));
        else { x.strokeStyle = '#222'; x.lineWidth = 0.6; x.strokeRect(s.x, s.y, s.w, s.h); }
      } else {
        x.fillStyle = '#c8553d';
        const lines = Math.min(3, (s.text.match(/\n/g) || []).length + 1);
        const sz = Math.max(2, s.size * Z.PT_TO_MM * 0.6);
        for (let i = 0; i < lines; i++) {
          const lw = s.w * (s.align === 'center' ? 0.6 : 0.75);
          const lx = s.align === 'center' ? s.x + (s.w - lw) / 2 : s.x;
          x.fillRect(lx, s.y + i * sz * 1.5, lw, sz);
        }
      }
      x.restore();
    }
    return c;
  }
  function panelLayouts(box) {
    const e = Z.flat(P())[S.cur];
    box.append(h('Layouts for this page'));
    if (e.pad) { box.append(note('This is a blank padding page. Click “Design this page” above to make it a real page first.')); return; }
    box.append(note('Click to try a layout. Your photos move into the new frames (with their crop and filters reset), and switching back brings them all back. Things you added yourself stay put.'));
    const groups = {};
    for (const [id, l] of Object.entries(Z.LAYOUTS)) (groups[l.group] ||= []).push(id);
    let order = e.section.type === 'chapter' && e.section.pages[0] === e.page ? ['Chapter openers', 'Photo pages', 'Covers'] : e.section.type === 'cover' || e.section.type === 'back' ? ['Covers', 'Photo pages', 'Chapter openers'] : ['Photo pages', 'Chapter openers', 'Covers'];
    const BR = 'Brutalist / architecture';
    order = P().look === 'brutalist' ? [BR, ...order] : [...order, BR];
    for (const g of order) {
      box.append(el('h4', {}, g));
      box.append(el('div', { class: 'layouts' }, groups[g].map((id) => el('button', {
        class: 'lay' + (e.page.layout === id ? ' on' : ''), title: Z.LAYOUTS[id].name,
        onclick: () => { Z.applyLayout(P(), e.page, id, e.section); S.sel = []; Z.changed(true); renderPanel(); Z.requestRender(); },
      }, layoutPreview(id), el('span', {}, Z.LAYOUTS[id].name)))));
    }
  }

  // add tab
  const TEXT_PRESETS = [
    ['Condensed headline', { font: 'Big Shoulders Display', bold: true, size: 60, text: 'HEADLINE', lh: 0.8, spacing: -3, upper: true }],
    ['Mono caption', { font: 'IBM Plex Mono', size: 8, text: 'Fig. 04 — the kitchen, 09:10', upper: true, spacing: 6 }],
    ['Black label', { font: 'IBM Plex Mono', size: 8, text: 'Site visit', upper: true, spacing: 6, bg: '#111111', color: '#ffffff' }],
    ['Grotesk title', { font: 'Archivo Black', size: 28, text: 'Title', upper: true, lh: 0.9, spacing: -2 }],
    ['Editorial serif', { font: 'Newsreader', size: 10, text: 'A paragraph set like a magazine: calm, readable, a little formal.', lh: 1.38 }],
    ['Big italic serif', { font: 'Instrument Serif', size: 40, text: 'for you', italic: true, lh: 1 }],
    ['Big title', { font: 'Abril Fatface', size: 40, text: 'Big title', lh: 1 }],
    ['Handwritten note', { font: 'Caveat', size: 22, text: 'a little handwritten note' }],
    ['Typewriter', { font: 'Special Elite', size: 11, text: 'Typed words, like a letter from another time.', lh: 1.45 }],
    ['Label strip', { font: 'Courier Prime', size: 10, text: 'LABEL MAKER', bg: '#111111', color: '#ffffff', upper: true, spacing: 12 }],
    ['Ransom note', { font: 'Anton', size: 26, text: 'love you', style: 'ransom', align: 'center' }],
    ['Marker scrawl', { font: 'Permanent Marker', size: 26, text: 'yes!!' }],
    ['Script', { font: 'Sacramento', size: 40, text: 'forever' }],
    ['Poster type', { font: 'Bebas Neue', size: 48, text: 'BIG NEWS', lh: 0.95 }],
    ['Highlighted', { font: 'Kalam', size: 14, text: 'important bit', bg: '#f2c14e' }],
  ];
  const TAPES = [['Masking', '#e9d98a', 'plain'], ['Kraft', '#b8915f', 'plain'], ['Pink stripes', '#f4a6b7', 'stripes'], ['Blue dots', '#7fb3d5', 'dots'], ['Mint grid', '#a8d5ba', 'grid'], ['Red check', '#d94f4f', 'checker'], ['Black', '#2b2b2b', 'plain'], ['Clear', '#e9ecef', 'plain']];
  const SCRAPS = [['Notebook', '#fffdf6', 'lined', 'torn'], ['Graph', '#f8faf6', 'grid', 'torn'], ['Kraft', '#c9a27a', 'kraft', 'torn'], ['Newsprint', '#e9e5dc', 'newsprint', 'straight'], ['Pink', '#f4c7cf', 'grain', 'torn'], ['Black', '#1c1c1c', 'none', 'torn'], ['Yellow note', '#f7e48b', 'none', 'straight'], ['Crumpled', '#f3eee4', 'crumpled', 'deckle']];
  const addEl = (e) => {
    const entry = Z.flat(P())[S.cur];
    if (entry.pad) return Z.toast('This is a blank padding page. Click “Design this page” first.');
    const { w: W, h: H } = Z.pageSize(P());
    e.x = W / 2 - e.w / 2 + (Math.random() - 0.5) * 10;
    e.y = H / 2 - e.h / 2 + (Math.random() - 0.5) * 10;
    entry.page.elements.push(e);
    S.sel = [e.id];
    Z.setTool('select');
    Z.changed(true);
    selectionChanged();
    return e;
  };
  function stickerIcon(kind) {
    const c = Z.canvas(64, 64);
    const x = c.getContext('2d');
    const def = Z.STICKERS[kind];
    Z.drawElement(x, Z.make.sticker({ kind, x: 6, y: 6, w: 52, h: 52, fill: def.fill || '#222', stroke: def.stroke || '#222', sw: (def.sw || 0) * 0.6 }), { ppm: 1, project: P() });
    return c;
  }
  function panelAdd(box) {
    box.append(h('Draw'));
    const drawing = S.tool === 'draw';
    box.append(el('div', { class: 'btnrow' }, btn(drawing ? '✓ Drawing (click to stop)' : '✎ Draw on the page', () => Z.setTool(drawing ? 'select' : 'draw'), drawing ? 'primary' : '')));
    box.append(row('Brush', seg([['pen', 'Pen'], ['marker', 'Marker'], ['pencil', 'Pencil'], ['highlighter', 'Highlighter']], () => S.pen.brush, (v) => (S.pen.brush = v))));
    box.append(slider('Width', () => S.pen.width, (v) => (S.pen.width = v), 0.2, 4, 0.1, ' mm'));
    box.append(row('Colour', colors(() => S.pen.color, (v) => (S.pen.color = v))));
    box.append(note('Each stroke becomes its own piece you can move, recolour or delete. Shortcut: P to draw, V to select, Esc to stop.'));
    box.append(h('Text'));
    box.append(el('div', { class: 'presets' }, TEXT_PRESETS.map(([name, o]) => el('button', { class: 'tp', style: { fontFamily: Z.fontStack(o.font) }, onclick: () => { addEl(Z.make.text({ w: 90, ...o })); focusText(); } }, name))));
    box.append(h('Photo frames'));
    box.append(el('div', { class: 'btnrow' },
      btn('Empty frame', () => addEl(Z.make.photo({ w: 70, h: 52 }))),
      btn('Polaroid frame', () => addEl(Z.make.photo({ w: 60, h: 72, style: 'polaroid', shadow: true, rot: -3 }))),
      btn('Torn-edge frame', () => addEl(Z.make.photo({ w: 70, h: 52, edge: 'torn', shadow: true })))));
    box.append(h('Stickers & shapes'));
    box.append(el('div', { class: 'stickers' }, Object.entries(Z.STICKERS).map(([k, d]) => el('button', { title: d.name, onclick: () => addEl(Z.make.sticker({ kind: k, fill: d.fill || '#222222', stroke: d.stroke || '#222222', sw: d.sw || 0, w: 26, h: 26 * (k === 'banner' || k === 'tag' || k === 'underline' ? 0.6 : 1), rot: (Math.random() - 0.5) * 16 })) }, stickerIcon(k)))));
    box.append(h('Tape'));
    box.append(el('div', { class: 'chips' }, TAPES.map(([n, c, p]) => el('button', { class: 'chip', onclick: () => addEl(Z.make.tape({ color: c, pattern: p, opacity: n === 'Clear' ? 0.5 : 0.82, rot: -12 + Math.random() * 24 })) }, el('i', { style: { background: c } }), n))));
    box.append(h('Paper scraps'));
    box.append(el('div', { class: 'chips' }, SCRAPS.map(([n, c, t, e]) => el('button', { class: 'chip', onclick: () => addEl(Z.make.paper({ color: c, texture: t, edge: e, rot: -6 + Math.random() * 12 })) }, el('i', { style: { background: c } }), n))));
    box.append(note('Tip: put a paper scrap behind a text box (Selected → Send back) for a cut-and-paste look, and add a strip of tape on a photo corner.'));
  }

  // page tab
  function panelPage(box) {
    const e = Z.flat(P())[S.cur];
    const st = P().settings;
    if (!e.pad) {
      const bg = e.page.bg;
      box.append(h('Paper for this page'));
      box.append(el('div', { class: 'papers' }, Z.PAPERS.map((pp) => el('button', { class: 'paper' + (bg.color === pp.color && bg.texture === pp.texture ? ' on' : ''), title: pp.name, onclick: () => { bg.color = pp.color; bg.texture = pp.texture; Z.changed(true); rebuild(); } }, paperSwatch(pp), el('span', {}, pp.name)))));
      box.append(row('Colour', colors(() => bg.color, (v) => (bg.color = v))));
      const tex = el('select', {}, Object.entries(Z.TEXTURES).map(([k, t]) => el('option', { value: k }, t.name)));
      tex.value = bg.texture || 'none';
      tex.onchange = () => { bg.texture = tex.value; Z.changed(true); };
      box.append(row('Texture', tex));
      box.append(slider('Texture strength', () => bg.tex, (v) => (bg.tex = v), 0, 1, 0.05));
      const apply = (pages) => { for (const pg of pages) pg.bg = Z.clone(bg); Z.changed(true); Z.toast(`Paper applied to ${pages.length} pages`); };
      box.append(el('div', { class: 'btnrow' },
        e.section && e.section.pages.length > 1 ? btn(`Use on all of “${e.section.name}”`, () => apply(e.section.pages)) : null,
        btn('Use on every page', () => { apply(P().sections.flatMap((s) => s.pages)); st.paper = bg.color; })));
      box.append(note('Printing tip: dark or full-colour backgrounds use a lot of ink and can make thin paper wavy. Light paper colours look like real paper and print best at home.'));
    }
    box.append(h('Zine settings'));
    const t = el('input', { type: 'text', value: P().title });
    t.oninput = () => { P().title = t.value; $('#title').value = t.value; Z.changed(false); };
    box.append(row('Title', t));
    const mini = Z.isMini(P());
    const fmtSel = el('select', {}, Object.entries(Z.FORMATS).filter(([, f]) => (f.book === 'mini') === mini).map(([k, f]) => el('option', { value: k }, f.label)));
    fmtSel.value = P().format;
    fmtSel.onchange = () => changeFormat(fmtSel.value);
    box.append(row('Size', fmtSel), note(mini ? 'To switch between mini zines and a stapled booklet, start a New zine (they are built differently).' : 'You can switch between booklet sizes any time; everything is scaled. Mini zines need a New zine.'));
    box.append(slider('Safe margin', () => st.safe, (v) => (st.safe = v), 3, 20, 0.5, ' mm'));
    box.append(note('Blue dashed line: keep words and faces inside it. Folding, trimming and the printer can all nibble at the edges.'));
    box.append(slider('Printer edge', () => st.printer, (v) => (st.printer = v), 0, 10, 0.5, ' mm'));
    box.append(note('The pink band is where most home printers can’t print (about 3–5 mm). It is shown on the outer edges only: the fold is in the middle of the sheet, so it prints fine. Trim it off at the end for clean edges (see the Guide).'));
    box.append(el('div', { class: 'checks' },
      check('Show guides', () => st.guides, (v) => { st.guides = v; topToggles(); }),
      check('Snap to guides and other items', () => st.snap, (v) => { st.snap = v; topToggles(); }),
      check('Show a 5 mm grid', () => st.grid, (v) => (st.grid = v))));
    const flat = Z.flat(P());
    const pads = flat.filter((x) => x.pad).length;
    box.append(h('Page count'));
    box.append(note(mini
      ? `${flat.length} pages = ${paperCount(flat.length)}. Each section is its own mini zine of 8 pages (cover, 6 inside pages, back).` + (pads ? ` ${pads} blank page${pads === 1 ? ' was' : 's were'} added to fill sections up to 8.` : '')
      : `${flat.length} pages = ${paperCount(flat.length)}.` + (pads ? ` ${pads} blank page${pads === 1 ? ' was' : 's were'} added before the back cover to reach a multiple of 4.` : '') + ' A long-reach stapler closes about 10–12 folded sheets of 120 g paper; see the Guide for thicker zines.'));
  }
  function paperSwatch(pp) {
    const c = Z.canvas(44, 44);
    const x = c.getContext('2d');
    x.fillStyle = pp.color;
    x.fillRect(0, 0, 44, 44);
    const pat = Z.texturePattern(x, pp.texture, 2.2);
    if (pat) { x.globalAlpha = 0.8; x.fillStyle = pat; x.fillRect(0, 0, 44, 44); }
    return c;
  }
  function changeFormat(f) {
    const a = Z.pageSize(P()), b = Z.FORMATS[f];
    const kx = b.w / a.w, ky = b.h / a.h;
    const fit = (pt) => Math.round(Math.max(pt * kx, Math.min(pt, 7)) * 2) / 2;
    for (const s of P().sections) for (const pg of s.pages) for (const e of pg.elements) {
      e.x *= kx; e.y *= ky; e.w *= kx;
      if (e.type !== 'text') e.h *= ky;
      if (e.type === 'text') e.size = fit(e.size);
      if (e.type === 'photo') { e.capSize = fit(e.capSize); e.border *= kx; }
      if (e.type === 'draw') e.width *= kx;
    }
    P().settings.safe = Math.round(P().settings.safe * kx * 2) / 2;
    P().format = f;
    Z.changed(true);
    refreshAll();
    Z.requestRender();
    Z.toast(`Changed to ${b.label}. Everything was scaled to fit.`);
  }

  // selected tab
  const FILTERS = [
    ['Original', {}], ['B&W', { mode: 'bw', contrast: 10 }], ['Hard B&W', { mode: 'bw', contrast: 45, grain: 18 }], ['Sepia', { mode: 'sepia', fade: 15 }],
    ['Faded film', { fade: 45, saturation: -25, warmth: 12, grain: 12 }], ['Warm', { warmth: 30, saturation: 10 }], ['Cool', { warmth: -25 }], ['Vivid', { saturation: 35, contrast: 12 }],
    ['Photocopy', { mode: 'photocopy', ink: '#1a1a1a' }], ['Halftone', { mode: 'halftone', ink: '#1a1a1a', dot: 1.0 }], ['Riso pink', { mode: 'halftone', ink: '#e0368c', dot: 1.2 }], ['Duotone blue', { mode: 'duotone', ink: '#1f3a5f' }], ['Duotone red', { mode: 'duotone', ink: '#b5442f' }],
  ];
  function panelSel(box) {
    const items = Z.selected();
    if (!items.length) return;
    if (items.length > 1) {
      box.append(h(`${items.length} items selected`), note('Drag to move them together. Shift-click adds or removes an item.'), commonButtons());
      return;
    }
    const { el: e, page } = items[0];
    const name = { photo: 'Photo', text: 'Text', sticker: 'Sticker', tape: 'Tape', paper: 'Paper scrap', draw: 'Drawing' }[e.type];
    box.append(h(name));
    if (e.type === 'photo') photoControls(box, e, page);
    if (e.type === 'text') textControls(box, e);
    if (e.type === 'sticker') {
      const pick = el('select', {}, Object.entries(Z.STICKERS).map(([k, d]) => el('option', { value: k }, d.name)));
      pick.value = e.kind;
      pick.onchange = () => { e.kind = pick.value; Z.changed(true); };
      box.append(row('Shape', pick), row('Fill', colors(() => e.fill, (v) => (e.fill = v))), row('Line', colors(() => e.stroke, (v) => (e.stroke = v))), slider('Outline', () => e.sw, (v) => (e.sw = v), 0, 3, 0.1, ' mm'), el('div', { class: 'checks' }, check('Shadow', () => e.shadow, (v) => (e.shadow = v))));
    }
    if (e.type === 'tape') {
      box.append(row('Colour', colors(() => e.color, (v) => (e.color = v))), row('Pattern', seg([['plain', 'Plain'], ['stripes', 'Stripes'], ['dots', 'Dots'], ['grid', 'Grid'], ['checker', 'Check']], () => e.pattern, (v) => (e.pattern = v))));
    }
    if (e.type === 'paper') {
      const tex = el('select', {}, Object.entries(Z.TEXTURES).map(([k, t]) => el('option', { value: k }, t.name)));
      tex.value = e.texture;
      tex.onchange = () => { e.texture = tex.value; Z.changed(true); };
      box.append(row('Colour', colors(() => e.color, (v) => (e.color = v))), row('Texture', tex), row('Edges', seg([['torn', 'Torn'], ['deckle', 'Deckled'], ['straight', 'Cut'], ['rounded', 'Rounded']], () => e.edge, (v) => (e.edge = v))), el('div', { class: 'checks' }, check('Shadow', () => e.shadow, (v) => (e.shadow = v))));
    }
    if (e.type === 'draw') {
      box.append(row('Brush', seg([['pen', 'Pen'], ['marker', 'Marker'], ['pencil', 'Pencil'], ['highlighter', 'Highlight']], () => e.brush, (v) => (e.brush = v))), slider('Width', () => e.width, (v) => (e.width = v), 0.2, 4, 0.1, ' mm'), row('Colour', colors(() => e.color, (v) => (e.color = v))));
    }
    box.append(h('Position'));
    box.append(slider('Rotate', () => e.rot || 0, (v) => (e.rot = v), -180, 180, 1, '°'));
    box.append(slider('Opacity', () => e.opacity == null ? 1 : e.opacity, (v) => (e.opacity = v), 0.1, 1, 0.05));
    const num = (k, label) => {
      const i = el('input', { type: 'number', step: '0.5', value: (+e[k]).toFixed(1) });
      i.onchange = () => { e[k] = +i.value; Z.changed(true); };
      return el('label', { class: 'num' }, label, i);
    };
    box.append(el('div', { class: 'nums' }, num('x', 'X'), num('y', 'Y'), num('w', 'W'), e.type === 'text' ? null : num('h', 'H')), note('Millimetres from the top-left of the page.'));
    box.append(commonButtons());
  }
  function commonButtons() {
    return el('div', {},
      el('h4', {}, 'Layer'),
      el('div', { class: 'btnrow' }, btn('To front', () => Z.ops.layer('front')), btn('Forward', () => Z.ops.layer('up')), btn('Backward', () => Z.ops.layer('down')), btn('To back', () => Z.ops.layer('back'))),
      el('div', { class: 'btnrow' }, btn('Duplicate', () => Z.ops.duplicate()), btn('Copy', () => Z.ops.copy()), btn('Delete', () => Z.ops.remove(), 'danger')),
      note('Shortcuts: Delete, Ctrl+D duplicate, Ctrl+C / Ctrl+V copy to another page, arrows nudge (Shift = 5 mm), [ and ] change layer, Alt while dragging turns snapping off.'));
  }
  function photoControls(box, e, page) {
    if (!e.photoId) box.append(note('Empty frame: drag a photo from the Photos tab onto it, or click a photo there.'));
    else {
      const rec = Z.findPhoto(P(), e.photoId);
      const g = Z.photoGeom(e, P());
      const dpi = rec ? Math.round((Math.min(rec.w, Z.photos.SIZES.full * (rec.w >= rec.h ? 1 : rec.w / rec.h)) / g.dw) * 25.4) : 0;
      box.append(el('div', { class: 'btnrow' },
        btn(S.cropId === e.id ? '✓ Done cropping' : 'Crop / move inside frame', () => { S.cropId = S.cropId === e.id ? null : e.id; Z.requestRender(); rebuild(); }, S.cropId === e.id ? 'primary' : ''),
        btn('Flip', () => { e.flip = !e.flip; Z.changed(true); }),
        btn('Empty frame', () => { e.photoId = null; Z.changed(true); rebuild(); })));
      box.append(slider('Zoom', () => e.zoom, (v) => (e.zoom = v), e.fit === 'contain' ? 0.3 : 1, 6, 0.05));
      box.append(row('Fit', seg([['cover', 'Fill frame'], ['contain', 'Whole photo']], () => e.fit, (v) => { e.fit = v; e.zoom = 1; e.ox = e.oy = 0; })));
      if (dpi && dpi < 150) box.append(el('p', { class: 'note warn' }, `This photo is printed at about ${dpi} dpi here, so it may look soft. Make the frame smaller or zoom out for sharper prints (200+ dpi is ideal).`));
      box.append(h('Look'));
      box.append(el('div', { class: 'filters' }, FILTERS.map(([n, f]) => el('button', { class: 'chip' + (sameFilter(e.filter, f) ? ' on' : ''), onclick: () => { e.filter = { ...Z.defaultFilter(), ...f }; Z.changed(true); rebuild(); } }, n))));
      const f = e.filter;
      box.append(slider('Brightness', () => f.brightness, (v) => (f.brightness = v), -60, 60),
        slider('Contrast', () => f.contrast, (v) => (f.contrast = v), -60, 80),
        slider('Saturation', () => f.saturation, (v) => (f.saturation = v), -100, 80),
        slider('Warmth', () => f.warmth, (v) => (f.warmth = v), -60, 60),
        slider('Fade', () => f.fade, (v) => (f.fade = v), 0, 100),
        slider('Grain', () => f.grain, (v) => (f.grain = v), 0, 100));
      if (['photocopy', 'halftone', 'duotone'].includes(f.mode)) box.append(row('Ink', colors(() => f.ink, (v) => (f.ink = v), { list: ['#1a1a1a', '#1f3a5f', '#e0368c', '#c8553d', '#3e7a4f', '#6d5a8c', '#e86a33'] })));
      if (f.mode === 'halftone') box.append(slider('Dot size', () => f.dot, (v) => (f.dot = v), 0.5, 3, 0.1, ' mm'));
      box.append(el('div', { class: 'checks' }, check('Ink on paper (blend with the paper underneath)', () => e.blend === 'multiply', (v) => (e.blend = v ? 'multiply' : 'normal'))));
      const sec = Z.findSection(P(), page);
      const copyLook = (pages) => { let n = 0; for (const pg of pages) for (const x of pg.elements) if (x.type === 'photo' && x !== e) { x.filter = Z.clone(e.filter); x.blend = e.blend; n++; } Z.changed(true); Z.toast(`Look copied to ${n} photos`); };
      box.append(el('div', { class: 'btnrow' }, btn('Same look for this page', () => copyLook([page])), sec ? btn(`…for “${sec.name}”`, () => copyLook(sec.pages)) : null, btn('…for the whole zine', () => copyLook(P().sections.flatMap((s) => s.pages)))));
    }
    box.append(h('Frame'));
    box.append(row('Style', seg([['plain', 'Plain'], ['polaroid', 'Polaroid']], () => e.style, (v) => (e.style = v))));
    box.append(row('Edges', seg([['straight', 'Straight'], ['rounded', 'Rounded'], ['deckle', 'Deckled'], ['torn', 'Torn']], () => e.edge, (v) => (e.edge = v))));
    if (e.style !== 'polaroid') {
      box.append(slider('Border', () => e.border, (v) => (e.border = v), 0, 12, 0.5, ' mm'));
      if (e.border > 0) box.append(row('Border colour', colors(() => e.borderColor, (v) => (e.borderColor = v))));
    }
    box.append(el('div', { class: 'checks' }, check('Drop shadow', () => e.shadow, (v) => (e.shadow = v))));
    box.append(h('Caption'));
    const cap = el('textarea', { rows: 2, placeholder: e.style === 'polaroid' ? 'written on the polaroid' : 'shown under the photo' });
    cap.value = e.caption;
    cap.oninput = () => { e.caption = cap.value; Z.changed(false); };
    box.append(cap);
    if (e.caption) {
      box.append(row('Font', fontSelect(() => e.capFont, (v) => (e.capFont = v))), slider('Size', () => e.capSize, (v) => (e.capSize = v), 6, 40, 1, ' pt'), row('Colour', colors(() => e.capColor, (v) => (e.capColor = v))));
    }
  }
  const sameFilter = (a, f) => JSON.stringify({ ...Z.defaultFilter(), ...f }) === JSON.stringify({ ...Z.defaultFilter(), ...a });
  function fontSelect(get, set) {
    const s = el('select', {}, [...new Set(Z.FONTS.map((f) => f.cat))].map((c) => el('optgroup', { label: c }, Z.FONTS.filter((f) => f.cat === c).map((f) => el('option', { value: f.f, style: { fontFamily: Z.fontStack(f.f) } }, f.f)))));
    s.value = get();
    s.onchange = () => { set(s.value); Z.changed(true); };
    return s;
  }
  function textControls(box, e) {
    const ta = el('textarea', { rows: 4, id: 'textEdit' });
    ta.value = e.text;
    ta.oninput = () => { e.text = ta.value; Z.changed(false); };
    box.append(ta);
    box.append(h('Font'));
    const cats = ['All', ...new Set(Z.FONTS.map((f) => f.cat))];
    box.append(el('div', { class: 'chips small' }, cats.map((c) => el('button', { class: 'chip' + (fontCat === c ? ' on' : ''), onclick: () => { fontCat = c; rebuild(); } }, c))));
    const sample = (e.text || 'Aa').split('\n')[0].slice(0, 22) || 'Aa';
    box.append(el('div', { class: 'fontlist' }, Z.FONTS.filter((f) => fontCat === 'All' || f.cat === fontCat).map((f) => el('button', {
      class: 'font' + (e.font === f.f ? ' on' : ''), style: { fontFamily: Z.fontStack(f.f) }, title: f.f,
      onclick: () => { e.font = f.f; S.textStyle.font = f.f; Z.changed(true); rebuild(); },
    }, el('span', { class: 'fs' }, sample), el('small', {}, f.f)))));
    box.append(slider('Size', () => e.size, (v) => { e.size = v; S.textStyle.size = v; }, 5, 160, 0.5, ' pt'));
    box.append(row('Colour', colors(() => e.color, (v) => { e.color = v; S.textStyle.color = v; })));
    box.append(row('Align', seg([['left', 'Left'], ['center', 'Centre'], ['right', 'Right']], () => e.align, (v) => (e.align = v))));
    box.append(el('div', { class: 'checks' }, check('Bold', () => e.bold, (v) => (e.bold = v)), check('Italic', () => e.italic, (v) => (e.italic = v)), check('UPPERCASE', () => e.upper, (v) => (e.upper = v))));
    box.append(slider('Letter spacing', () => e.spacing, (v) => (e.spacing = v), -10, 80, 1, '%'));
    box.append(slider('Line height', () => e.lh, (v) => (e.lh = v), 0.7, 2.5, 0.05));
    box.append(row('Style', seg([['plain', 'Normal'], ['ransom', 'Ransom note']], () => e.style, (v) => (e.style = v))));
    box.append(row('Highlight', colors(() => e.bg, (v) => (e.bg = v), { none: true })));
    box.append(row('Outline', colors(() => e.outline, (v) => (e.outline = v), { none: true })));
  }
  function focusText() {
    tab = 'sel';
    renderPanel();
    const t = $('#textEdit');
    if (t) { t.focus(); t.select(); }
  }

  // ---------- files
  async function saveFile() {
    Z.pendingCommit.flush();
    Z.toast('Packing your zine and photos into one file…');
    const blob = await Z.store.exportFile(P());
    Z.download(blob, Z.slug(P().title) + '-' + new Date().toISOString().slice(0, 10) + '.zine');
    Z.toast(`Saved ${(blob.size / 1e6).toFixed(1)} MB. Keep this file safe: it has everything (layout and photos).`, 5000);
  }
  async function openFile(e) {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (!confirm('Open this project? It replaces what is in the editor now (save that to a file first if you want to keep it).')) return;
    try {
      const p = await Z.store.importFile(f);
      Z.loadProject(p);
      Z.toast(`Opened “${p.title}”.`);
    } catch (err) {
      alert('Could not open that file: ' + err.message);
    }
  }
  function formatCards(selected, onPick) {
    const order = ['A6', 'MINI', 'A5', 'QL', 'MINIL', 'HL'];
    let groupLabel = null;
    return el('div', { class: 'modes' }, order.map((k) => {
      const f = Z.FORMATS[k];
      const r = el('input', { type: 'radio', name: 'fmt', value: k });
      r.checked = k === selected;
      r.onchange = () => onPick(k);
      const head = f.paper !== groupLabel ? el('h4', {}, f.paper === 'A4' ? 'A4 paper (Europe and most of the world)' : 'US Letter paper') : null;
      groupLabel = f.paper;
      return [head, el('label', { class: 'mode' }, r, formatIcon(f), el('div', {}, el('b', {}, `${f.name} · ${f.size}`), el('div', { class: 'note' }, f.how)))];
    }));
  }
  // a little drawing of how one paper sheet becomes pages
  function formatIcon(f) {
    const c = Z.canvas(64, 64);
    const x = c.getContext('2d');
    const k = 56 / Math.max(f.paperW, f.paperH);
    const W = f.paperW * k, H = f.paperH * k, ox = (64 - W) / 2, oy = (64 - H) / 2;
    x.fillStyle = '#fff';
    x.strokeStyle = '#8a7f70';
    x.lineWidth = 1;
    x.fillRect(ox, oy, W, H);
    x.strokeRect(ox + 0.5, oy + 0.5, W - 1, H - 1);
    x.setLineDash([2, 2]);
    x.beginPath();
    if (f.book === 'fold') { x.moveTo(ox + W / 2, oy); x.lineTo(ox + W / 2, oy + H); }
    if (f.book === 'fold2up') { x.moveTo(ox + W / 2, oy); x.lineTo(ox + W / 2, oy + H); x.moveTo(ox, oy + H / 2); x.lineTo(ox + W, oy + H / 2); }
    if (f.book === 'mini') { for (let i = 1; i < 4; i++) { x.moveTo(ox + (W * i) / 4, oy); x.lineTo(ox + (W * i) / 4, oy + H); } x.moveTo(ox, oy + H / 2); x.lineTo(ox + W, oy + H / 2); }
    x.stroke();
    x.setLineDash([]);
    x.strokeStyle = '#c8553d';
    x.lineWidth = 2;
    x.beginPath();
    if (f.book === 'fold2up') { x.moveTo(ox, oy + H / 2); x.lineTo(ox + W, oy + H / 2); }
    if (f.book === 'mini') { x.moveTo(ox + W / 4, oy + H / 2); x.lineTo(ox + (3 * W) / 4, oy + H / 2); }
    x.stroke();
    return el('span', { class: 'ficon', title: 'dashed: fold · red: cut' }, c);
  }
  function openNew(first) {
    const m = $('#newModal');
    const body = $('.body', m);
    body.innerHTML = '';
    let fmt = first ? 'A6' : P().format;
    let look = first ? 'brutalist' : P().look || 'scrapbook';
    const lookBox = el('div', { class: 'seg looks' }, [['brutalist', 'Brutalist / architecture magazine'], ['scrapbook', 'Scrapbook / collage']].map(([v, label]) => {
      const b = el('button', { class: look === v ? 'on' : '', onclick: () => { look = v; Z.$$('button', lookBox).forEach((x) => x.classList.toggle('on', x === b)); } }, label);
      return b;
    }));
    const t = el('input', { type: 'text', value: first ? 'Our Year' : P().title });
    const desc = el('p', { class: 'note' });
    const describe = () => {
      desc.textContent = Z.FORMATS[fmt].book === 'mini'
        ? 'You get twelve little books, one per month, 8 pages each: a cover, six pages for photos and a back page. Each one is one sheet of paper.'
        : 'You get one stapled book: a cover, an intro page, January to December (an opener and two photo pages each) and a back cover. Add or remove pages and chapters any time.';
    };
    describe();
    body.append(
      first ? el('p', {}, 'Welcome! First, pick the size of your zine. Each one prints on normal home paper.') : note('Starts a fresh zine. Your current zine and its photos are replaced, so save it to a file first if you want to keep it.'),
      formatCards(fmt, (k) => { fmt = k; describe(); }), desc,
      el('h4', {}, 'Starting look'), lookBox,
      note('Brutalist: grotesk and mono type, black rules, big numbers, black-and-white photos, lots of white space. Scrapbook: handwriting, polaroids, tape and collage. Either way every page can be changed, and all layouts and fonts stay available.'),
      row('Title', t),
      el('div', { class: 'btnrow right' }, first ? null : btn('Cancel', closeModals), btn(first ? 'Start' : 'Start a new zine', async () => {
        const p = Z.newProject(fmt, look);
        p.title = t.value || 'Our Year';
        for (const s of p.sections) for (const pg of s.pages) for (const x of pg.elements) if (x.type === 'text' && x.text === 'Our Year') x.text = p.title;
        closeModals();
        Z.loadProject(p);
        await Z.store.gc(p);
        if (first) openGuide('start');
      }, 'primary')));
    m.classList.add('open');
  }

  // ---------- export
  function sheetDiagram(side, label) {
    const k = 150 / Math.max(side.w, side.h);
    const c = Z.canvas(side.w * k * 2, side.h * k * 2);
    const x = c.getContext('2d');
    x.scale(2 * k, 2 * k);
    x.fillStyle = '#fff';
    x.fillRect(0, 0, side.w, side.h);
    const fl = Z.flat(P()), f = Z.pageSize(P());
    for (const s of side.slots) {
      x.save();
      x.translate(s.x + f.w / 2, s.y + f.h / 2);
      if (s.rot) x.rotate(Math.PI);
      x.fillStyle = fl[s.idx].pad ? '#f3efe8' : '#f7e3dc';
      x.fillRect(-f.w / 2 + 1, -f.h / 2 + 1, f.w - 2, f.h - 2);
      x.fillStyle = '#5a4a3a';
      x.font = `bold ${Math.min(f.w, f.h) * 0.32}px system-ui, sans-serif`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      const e = fl[s.idx];
      x.fillText(Z.isMini(P()) ? String(e.bn) : String(e.n), 0, 0);
      x.restore();
    }
    x.strokeStyle = '#8a7f70';
    x.lineWidth = 0.6;
    x.strokeRect(0, 0, side.w, side.h);
    c.style.width = side.w * k + 'px';
    return el('figure', { class: 'sheet' }, c, el('figcaption', {}, label));
  }
  function openExport() {
    Z.pendingCommit.flush();
    const m = $('#exportModal');
    const body = $('.body', m);
    body.innerHTML = '';
    const flat = Z.flat(P());
    const N = flat.length;
    const fmt = Z.pageSize(P());
    let empty = 0;
    for (const e of flat) for (const x of e.page.elements) if (x.type === 'photo' && !x.photoId) empty++;
    const mini = fmt.book === 'mini';
    const opts = { mode: mini ? 'mini' : 'booklet', dpi: 300, coverSeparate: false, testOnly: false };
    const pageName = `${fmt.size} page`;
    const modes = mini ? [
      ['mini', 'Mini zine sheets', `One PDF with one ${fmt.paper} page per mini zine. Print on ONE side only, then fold and cut (see the Guide).`],
    ] : [
      ['booklet', 'Booklet for a printer that prints both sides', fmt.book === 'fold2up'
        ? `One PDF. Each ${fmt.paper} sheet holds two small folded sheets (8 pages). Print double-sided, flip on the LONG edge, then cut every sheet in half across the middle.`
        : `One PDF. Each ${fmt.paper} sheet holds 4 pages in folding order. Print double-sided, flip on the SHORT edge.`],
      ['manual', 'Booklet, printing the second side by hand', 'Two PDFs: the fronts, then the backs. For printers without automatic double-sided printing.'],
    ];
    modes.push(['pages', 'Single pages (proof)', `Every page on its own ${pageName}, in reading order. To check on screen, or for a print shop.`],
      ['spreads', 'Reading spreads (proof)', 'Pages side by side as she will see them when the zine is open. Nice to preview on screen.']);
    const modeBox = el('div', { class: 'modes' }, modes.map(([v, t, d]) => {
      const r = el('input', { type: 'radio', name: 'xmode', value: v });
      r.checked = v === opts.mode;
      r.onchange = () => { opts.mode = v; refreshOpts(); };
      return el('label', { class: 'mode' }, r, el('div', {}, el('b', {}, t), el('div', { class: 'note' }, d)));
    }));
    const dpiSel = el('select', {}, el('option', { value: 300 }, '300 dpi: best (final print)'), el('option', { value: 150 }, '150 dpi: quick draft'));
    dpiSel.onchange = () => (opts.dpi = +dpiSel.value);
    const cover = el('input', { type: 'checkbox' });
    cover.onchange = () => (opts.coverSeparate = cover.checked);
    const test = el('input', { type: 'checkbox' });
    test.onchange = () => (opts.testOnly = test.checked);
    const extra = el('div', { class: 'checks' },
      el('label', { class: 'check' }, test, mini ? ' Only the first mini zine (a test print)' : ' Only the first sheet (a test print to check the printer settings)'),
      mini ? null : el('label', { class: 'check' }, cover, ' Put the cover sheet in its own file (to print it on thicker card)'));
    const diagrams = el('div', { class: 'sheets' });
    const impo = el('details', {}, el('summary', {}, 'See which page goes where on the paper'), diagrams);
    const drawDiagrams = () => {
      diagrams.innerHTML = '';
      const mode = opts.mode === 'manual' ? 'booklet' : opts.mode;
      const plan = Z.printPlan(P(), { ...opts, mode, testOnly: false, coverSeparate: false })[0];
      const sides = plan.sides.slice(0, mini ? 2 : 4);
      sides.forEach((sd, i) => diagrams.append(sheetDiagram(sd, mini ? `Mini zine ${i + 1} (top row prints upside down)` : `Paper sheet ${Math.floor(i / 2) + 1}, ${i % 2 ? 'back' : 'front'}`)));
      diagrams.append(note(mini ? 'Numbers are the page numbers inside each little book (1 = cover, 8 = back).'
        : fmt.book === 'fold2up' ? 'After cutting, the top halves are the outer sheets and the bottom halves the inner ones: fold each, then put the bottom-half stack inside the top-half stack.'
        : 'Sheet 1 is the outside of the zine. Stack the folded sheets with sheet 1 outside and the last sheet in the middle.'));
    };
    const prog = el('div', { class: 'progress' }, el('div', { class: 'bar' }));
    const status = el('div', { class: 'note' });
    let cancelled = false;
    const go = btn('Export PDF', async () => {
      go.disabled = true;
      cancelled = false;
      status.textContent = 'Getting photos and fonts ready…';
      await Z.fontsReady;
      try {
        const t0 = performance.now();
        const files = await Z.exportPrint(P(), opts, (d, n, entry) => {
          $('.bar', prog).style.width = Math.round((d / n) * 100) + '%';
          status.textContent = `Rendering page ${entry.n} (${d} of ${n})…`;
        }, () => cancelled);
        for (const f of files) Z.download(f.blob, f.name);
        Z.lastExport = files;
        status.textContent = `Done in ${((performance.now() - t0) / 1000).toFixed(0)} s: ${files.map((f) => `${f.name} (${(f.blob.size / 1e6).toFixed(1)} MB)`).join(', ')}. Next: open the Guide for printing, folding and binding.`;
      } catch (err) {
        status.textContent = err.message === 'cancelled' ? 'Cancelled.' : 'Export failed: ' + err.message;
        console.error(err);
      }
      go.disabled = false;
    }, 'primary');
    const refreshOpts = () => {
      const printing = ['booklet', 'manual', 'mini'].includes(opts.mode);
      extra.style.display = impo.style.display = printing ? '' : 'none';
      if (printing) drawDiagrams();
    };
    const pads = flat.filter((e) => e.pad).length;
    body.append(
      el('p', {}, `Your zine has ${N} pages` + (pads ? ` (including ${pads} blank padding page${pads === 1 ? '' : 's'})` : '') + `: ${paperCount(N)}.`),
      empty ? el('p', { class: 'note warn' }, `${empty} photo frame${empty === 1 ? ' is' : 's are'} still empty and will print as blank space.`) : null,
      modeBox, row('Quality', dpiSel), extra, impo, prog, status,
      el('div', { class: 'btnrow right' }, btn('Close', () => { cancelled = true; closeModals(); }), btn('Printing guide', () => openGuide(mini ? 'mini' : fmt.book === 'fold2up' ? 'pocket' : 'print')), go));
    refreshOpts();
    m.classList.add('open');
  }

  function openGuide(anchor) {
    const m = $('#guideModal');
    $('.body', m).innerHTML = Z.GUIDE_HTML;
    m.classList.add('open');
    if (anchor) setTimeout(() => { const a = $('#g-' + anchor, m); if (a) a.scrollIntoView(); }, 30);
  }
  function closeModals() {
    Z.$$('.modal.open').forEach((m) => m.classList.remove('open'));
  }

  return {
    init, refreshAll, refreshLight, pageChanged, selectionChanged, focusText, goSpread, importFiles, saveFile, openGuide, openNew, closeModals,
    toolChanged: () => { if (tab === 'add') renderPanel(); },
    fontsLoaded: () => { if (tab === 'sel' || tab === 'add') renderPanel(); },
    _goTo: goTo,
  };
})();
