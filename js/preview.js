// Preview: the zine as a reader holds it. Every page is drawn exactly as it prints and put on a
// leaf that turns around the spine: the closed cover first, then each spread, then the back cover.
// Mini zines are previewed one little book at a time.
'use strict';
Z.preview = (() => {
  const S = Z.state;
  const el = Z.el;
  let m, stage, bookEl, where, pick, editBtn;
  let flat = [], b0 = 0, n = 0, k = 0, leaves = [], urls = [], job = 0, raise = 1000, paintOrder = [];
  const isOpen = () => m && m.classList.contains('open');

  function init() {
    m = Z.$('#previewModal');
    stage = el('div', { class: 'pv-stage' });
    bookEl = el('div', { class: 'pv-book' });
    stage.append(bookEl);
    where = el('span', { class: 'pv-where' });
    pick = el('select', { class: 'pv-pick', title: 'Which mini zine' });
    pick.onchange = () => build(+pick.value, 0);
    editBtn = el('button', { class: 'btn', title: 'Close the preview and edit these pages' }, 'Edit these pages');
    editBtn.onclick = () => {
      const idx = b0 + Math.max(0, Math.min(2 * k - 1, n - 1));
      close();
      Z.ui._goTo(idx);
    };
    m.append(el('div', { class: 'pv' },
      el('div', { class: 'pv-head' }, el('b', {}, 'Preview'), pick, el('span', { class: 'spacer' }), editBtn, el('button', { class: 'btn icon', title: 'Close (Esc)', onclick: close }, '✕')),
      stage,
      el('div', { class: 'pv-foot' },
        el('button', { class: 'btn icon', title: 'Turn back (←)', onclick: () => turn(-1) }, '◀'), where,
        el('button', { class: 'btn icon', title: 'Turn the page (→)', onclick: () => turn(1) }, '▶'))));
    // click or swipe on the right half turns forward, on the left half back
    let down = null;
    stage.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
    stage.addEventListener('pointerup', (e) => {
      if (!down) return;
      const dx = e.clientX - down[0], dy = e.clientY - down[1];
      down = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) return turn(dx < 0 ? 1 : -1);
      if (Math.hypot(dx, dy) > 10) return;
      const r = bookEl.getBoundingClientRect();
      turn(e.clientX > r.left + r.width / 2 ? 1 : -1);
    });
    document.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); turn(1); }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); turn(-1); }
    });
    window.addEventListener('resize', () => isOpen() && size());
  }

  function open() {
    if (!m) init();
    Z.pendingCommit.flush();
    flat = Z.flat(S.project);
    const bl = Z.bookLen(S.project, flat.length);
    const book = Math.floor(S.cur / bl);
    pick.innerHTML = '';
    pick.style.display = Z.isMini(S.project) ? '' : 'none';
    for (let i = 0; i < flat.length / bl; i++) {
      const first = flat[i * bl];
      pick.append(el('option', { value: i }, `Mini zine ${i + 1}` + (first.section ? ` · ${first.section.name}` : '')));
    }
    pick.value = book;
    m.classList.add('open');
    build(book, Math.floor((S.cur - book * bl + 1) / 2));
  }
  function close() {
    m.classList.remove('open');
    job++;
  }

  function build(book, at) {
    const bl = Z.bookLen(S.project, flat.length);
    b0 = book * bl;
    n = Math.min(bl, flat.length - b0);
    k = Z.clamp(at, 0, n / 2);
    urls.forEach((u) => URL.revokeObjectURL(u));
    urls = [];
    bookEl.innerHTML = '';
    bookEl.append(el('div', { class: 'shade l' }), el('div', { class: 'shade r' }));
    leaves = [];
    for (let i = 0; i < n / 2; i++) {
      const face = (side, idx) => el('div', { class: 'face ' + side, style: { background: flat[idx].page.bg.color || '#fff' } });
      const lf = el('div', { class: 'leaf' }, face('front', b0 + 2 * i), face('back', b0 + 2 * i + 1));
      lf.addEventListener('transitionend', (e) => { if (e.propertyName === 'transform') settle(lf, i); });
      leaves.push(lf);
      bookEl.append(lf);
    }
    leaves.forEach((lf, i) => { lf.classList.toggle('turned', i < k); settle(lf, i); });
    size();
    show();
    paint(++job);
  }

  // unturned leaves stack with the next one to read on top; turned ones the other way round
  function settle(lf, i) {
    lf.style.zIndex = i < k ? i + 1 : n / 2 - i;
  }

  function turn(d) {
    const next = Z.clamp(k + d, 0, n / 2);
    if (next === k) return;
    const lf = leaves[d > 0 ? k : k - 1];
    lf.style.zIndex = ++raise; // the turning leaf passes over everything until it lands
    k = next;
    lf.classList.toggle('turned', d > 0);
    show();
  }

  function size() {
    const { w: W, h: H } = Z.pageSize(S.project);
    const s = Math.min((stage.clientWidth - 24) / (2 * W), (stage.clientHeight - 24) / H);
    bookEl.style.width = 2 * W * s + 'px';
    bookEl.style.height = H * s + 'px';
    bookEl.style.setProperty('--half', (W * s) / 2 + 'px');
    return s;
  }

  function show() {
    // a closed book sits centred: shift by half a page when only one side has pages
    bookEl.style.transform = `translateX(${k === 0 ? 'calc(-1 * var(--half))' : k === n / 2 ? 'var(--half)' : '0px'})`;
    bookEl.children[0].classList.toggle('on', k > 0);
    bookEl.children[1].classList.toggle('on', k < n / 2);
    const no = (i) => (Z.isMini(S.project) ? flat[b0 + i].bn : flat[b0 + i].n);
    where.textContent = k === 0 ? 'Cover' : k === n / 2 ? 'Back cover' : `Pages ${no(2 * k - 1)}–${no(2 * k)}`;
    // the pages around the open spread are drawn first
    paintOrder = [...Array(n).keys()].sort((a, b) => Math.abs(a - (2 * k - 0.5)) - Math.abs(b - (2 * k - 0.5)));
  }

  // Pages are drawn one at a time, nearest to the open spread first, and kept as JPEGs so a
  // long zine does not hold dozens of full-size canvases in memory.
  async function paint(my) {
    await Z.fontsReady;
    const done = new Set();
    const dpr = window.devicePixelRatio || 1;
    const ppm = Math.min(10, size() * dpr * 1.25);
    while (my === job && isOpen() && done.size < n) {
      const i = paintOrder.find((x) => !done.has(x));
      done.add(i);
      try {
        const c = await Z.renderEntry(S.project, flat, b0 + i, ppm, true);
        if (my !== job) return;
        const url = URL.createObjectURL(Z.canvasJpeg(c, 0.9));
        urls.push(url);
        const face = leaves[i >> 1].children[i & 1];
        face.append(el('img', { src: url, alt: '', draggable: 'false' }));
      } catch (err) {
        console.warn('Preview: could not draw page', b0 + i + 1, err);
      }
      await Z.yieldUI();
    }
  }

  return { open, close };
})();
