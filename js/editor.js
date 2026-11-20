// The workspace: draws the current spread, and handles selecting, moving, resizing, rotating,
// cropping, drawing, snapping and dropping photos.
'use strict';
(() => {
  const M = 16; // mm of desk around the spread (room for handles)
  const S = Z.state;
  let cv, ctx, ov, stage;
  let ppmCss = 3;
  let drag = null;
  let guides = [];
  let live = null; // stroke being drawn

  const proj = () => S.project;
  const dims = () => Z.pageSize(S.project);
  Z.curFlat = () => Z.flat(S.project);
  Z.curSpread = () => {
    const flat = Z.curFlat();
    S.cur = Z.clamp(S.cur, 0, flat.length - 1);
    const bl = Z.bookLen(S.project, flat.length);
    return Z.spreads(flat.length, bl)[Z.spreadOf(flat.length, S.cur, bl)];
  };
  Z.curEntry = () => Z.curFlat()[S.cur];
  Z.curPage = () => Z.curEntry().page;

  // element lookup across the visible spread: returns { el, page, idx, side }
  const visible = () => {
    const flat = Z.curFlat();
    const sp = Z.curSpread();
    return sp.map((idx, side) => (idx == null ? null : { idx, side, page: flat[idx].page, entry: flat[idx] }));
  };
  Z.findEl = (id) => {
    for (const s of S.project.sections) for (const page of s.pages) {
      const el = page.elements.find((e) => e.id === id);
      if (el) return { el, page };
    }
    return null;
  };
  Z.selected = () => S.sel.map(Z.findEl).filter(Boolean);
  const sideOfPage = (page) => {
    const v = visible().find((x) => x && x.page === page);
    return v ? v.side : 0;
  };

  Z.initEditor = () => {
    stage = Z.$('#stage');
    cv = Z.$('#cv');
    ov = Z.$('#ov');
    ctx = cv.getContext('2d');
    new ResizeObserver(() => Z.requestRender()).observe(stage);
    ov.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    ov.addEventListener('dblclick', dbl);
    stage.addEventListener('wheel', wheel, { passive: false });
    ov.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    ov.addEventListener('drop', dropOn);
  };

  // --- coordinates
  const toSpread = (e) => {
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) / ppmCss - M, (e.clientY - r.top) / ppmCss - M];
  };
  const pageAt = ([x, y]) => {
    const { w: W, h: H } = dims();
    if (y < -2 || y > H + 2) return null;
    const side = x < W ? 0 : 1;
    const v = visible()[side];
    return v && x > -2 && x < 2 * W + 2 ? v : null;
  };
  const local = (el, side, [x, y]) => {
    const { w: W } = dims();
    const cx = el.x + el.w / 2 + side * W, cy = el.y + el.h / 2;
    const a = -Z.rad(el.rot || 0);
    const dx = x - cx, dy = y - cy;
    return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
  };
  const hits = (el, side, p) => {
    const [lx, ly] = local(el, side, p);
    if (el.type === 'draw') {
      const pts = Z.strokePoints(el);
      const tol = el.width * (el.brush === 'highlighter' ? 2.5 : el.brush === 'marker' ? 1.1 : 0.5) + 6 / ppmCss;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[i + 1] || a;
        const vx = b[0] - a[0], vy = b[1] - a[1];
        const t = Z.clamp(((lx - a[0]) * vx + (ly - a[1]) * vy) / (vx * vx + vy * vy || 1), 0, 1);
        if (Math.hypot(lx - a[0] - t * vx, ly - a[1] - t * vy) < tol) return true;
      }
      return false;
    }
    const extra = el.type === 'photo' && el.caption && el.style !== 'polaroid' ? el.capSize * Z.PT_TO_MM * 1.6 + 2 : 0;
    const pad = 2 / ppmCss;
    return Math.abs(lx) <= el.w / 2 + pad && ly >= -el.h / 2 - pad && ly <= el.h / 2 + extra + pad;
  };
  const hitTest = (p) => {
    const vis = visible();
    const under = pageAt(p);
    const order = [];
    // the page under the pointer is on top, but its neighbour's elements can cross the fold
    for (const v of vis) if (v && v !== under) order.push(v);
    if (under) order.push(under);
    for (let k = order.length - 1; k >= 0; k--) {
      const v = order[k];
      if (v.entry.pad) continue;
      for (let i = v.page.elements.length - 1; i >= 0; i--) {
        const el = v.page.elements[i];
        if (el.hidden || el.locked) continue;
        if (hits(el, v.side, p)) return { el, page: v.page, side: v.side };
      }
    }
    return null;
  };

  // --- handles of the single selected element (spread mm)
  const handlePoints = (el, side) => {
    const { w: W } = dims();
    const cx = el.x + el.w / 2 + side * W, cy = el.y + el.h / 2;
    const a = Z.rad(el.rot || 0), c = Math.cos(a), s = Math.sin(a);
    const tr = (x, y) => [cx + x * c - y * s, cy + x * s + y * c];
    const hw = el.w / 2, hh = el.h / 2;
    const hs = {
      nw: [-hw, -hh], n: [0, -hh], ne: [hw, -hh], e: [hw, 0], se: [hw, hh], s: [0, hh], sw: [-hw, hh], w: [-hw, 0], rot: [0, -hh - 22 / ppmCss],
    };
    if (el.type === 'text') { delete hs.n; delete hs.s; }
    const out = {};
    for (const [k, [x, y]] of Object.entries(hs)) out[k] = tr(x, y);
    return out;
  };

  // --- render
  let raf = 0;
  Z.requestRender = () => {
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); });
  };
  function render() {
    if (!cv) return;
    const { w: W, h: H } = dims();
    const avail = [stage.clientWidth - 24, stage.clientHeight - 24];
    const fit = Math.min(avail[0] / (2 * W + 2 * M), avail[1] / (H + 2 * M));
    ppmCss = Math.max(0.5, fit * S.zoom);
    const cssW = (2 * W + 2 * M) * ppmCss, cssH = (H + 2 * M) * ppmCss;
    const dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(cssW * dpr) || cv.height !== Math.round(cssH * dpr)) {
      cv.width = Math.round(cssW * dpr);
      cv.height = Math.round(cssH * dpr);
    }
    cv.style.width = ov.style.width = cv.parentNode.style.width = cssW + 'px';
    cv.style.height = ov.style.height = cv.parentNode.style.height = cssH + 'px';
    const ppm = ppmCss * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    const flat = Z.curFlat();
    const vis = visible();
    ctx.setTransform(ppm, 0, 0, ppm, M * ppm, M * ppm);
    // paper shadow
    vis.forEach((v, side) => {
      if (!v) return;
      ctx.save();
      ctx.shadowColor = 'rgba(40,30,20,0.28)';
      ctx.shadowBlur = 12 * dpr;
      ctx.shadowOffsetY = 3 * dpr;
      ctx.fillStyle = '#fff';
      ctx.fillRect(side * W, 0, W, H);
      ctx.restore();
    });
    vis.forEach((v, side) => {
      if (!v) return;
      const { facing, facingDx } = Z.pageEntryFacing(flat, v.idx);
      Z.renderPage(ctx, v.page, { ppm, x0: (M + side * W) * ppm, y0: M * ppm, project: proj(), facing, facingDx, editor: true, cropId: S.cropId });
    });
    ctx.setTransform(ppm, 0, 0, ppm, M * ppm, M * ppm);
    const px = 1 / ppmCss; // one css pixel in mm
    if (live) {
      ctx.save();
      ctx.translate(live.side * W, 0);
      const tmp = Z.make.draw({ ...live.opts, pts: live.pts.map(([x, y]) => [x, y]), x: 0, y: 0, w: 1, h: 1, bw: 1, bh: 1, id: 'live' });
      ctx.translate(-0.5, -0.5);
      Z.drawElement(ctx, tmp, { ppm, project: proj() });
      ctx.restore();
    }
    // guides
    vis.forEach((v, side) => {
      if (!v) return;
      const x0 = side * W;
      const st = proj().settings;
      if (v.entry.pad) {
        ctx.fillStyle = 'rgba(120,110,100,0.08)';
        ctx.fillRect(x0, 0, W, H);
        ctx.fillStyle = 'rgba(80,70,60,0.75)';
        ctx.font = `${13 * px}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('Blank page added so the page count', x0 + W / 2, H / 2 - 8 * px);
        ctx.fillText('is a multiple of 4 (one sheet = 4 pages).', x0 + W / 2, H / 2 + 10 * px);
        ctx.fillText('Use "Design this page" in the left list to fill it.', x0 + W / 2, H / 2 + 28 * px);
      }
      if (!st.guides) return;
      // printer's unprintable band on the three outer edges (not the fold)
      const pm = st.printer;
      if (pm > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(200,85,61,0.10)';
        const outerX = side === 0 ? x0 : x0 + W - pm;
        ctx.fillRect(x0, 0, W, pm);
        ctx.fillRect(x0, H - pm, W, pm);
        ctx.fillRect(outerX, pm, pm, H - 2 * pm);
        ctx.restore();
      }
      ctx.save();
      ctx.strokeStyle = 'rgba(60,130,200,0.7)';
      ctx.lineWidth = px;
      ctx.setLineDash([4 * px, 3 * px]);
      ctx.strokeRect(x0 + st.safe, st.safe, W - 2 * st.safe, H - 2 * st.safe);
      ctx.restore();
      if (st.grid) {
        ctx.save();
        ctx.strokeStyle = 'rgba(60,130,200,0.15)';
        ctx.lineWidth = px;
        for (let x = 5; x < W; x += 5) { ctx.beginPath(); ctx.moveTo(x0 + x, 0); ctx.lineTo(x0 + x, H); ctx.stroke(); }
        for (let y = 5; y < H; y += 5) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + W, y); ctx.stroke(); }
        ctx.restore();
      }
    });
    if (vis[0] && vis[1]) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = px;
      ctx.setLineDash([6 * px, 4 * px]);
      ctx.beginPath(); ctx.moveTo(W, -6 * px); ctx.lineTo(W, H + 6 * px); ctx.stroke();
      ctx.restore();
    }
    // current page marker
    const curSide = Z.curSpread().indexOf(S.cur);
    if (curSide >= 0) {
      ctx.fillStyle = '#c8553d';
      ctx.fillRect(curSide * W, -5 * px, W, 3 * px);
    }
    // page labels
    ctx.fillStyle = 'rgba(60,50,40,0.7)';
    ctx.font = `${12 * px}px system-ui, sans-serif`;
    vis.forEach((v, side) => {
      if (!v) return;
      ctx.textAlign = 'center';
      ctx.fillText(Z.pageLabel(v.entry), side * W + W / 2, H + 12 * px);
    });
    // snapping guides
    ctx.strokeStyle = '#e0368c';
    ctx.lineWidth = px;
    for (const g of guides) {
      ctx.beginPath();
      if (g.x != null) { ctx.moveTo(g.x, -M); ctx.lineTo(g.x, H + M); } else { ctx.moveTo(-M, g.y); ctx.lineTo(2 * W + M, g.y); }
      ctx.stroke();
    }
    // selection
    for (const { el, page } of Z.selected()) {
      const side = sideOfPage(page);
      const pts = Z.corners(el, side * W);
      ctx.strokeStyle = S.cropId === el.id ? '#f2a516' : '#2a7de1';
      ctx.lineWidth = 1.5 * px;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.stroke();
      if (S.sel.length === 1 && !S.cropId) {
        const hp = handlePoints(el, side);
        ctx.beginPath();
        ctx.moveTo(...(hp.n || [(hp.nw[0] + hp.ne[0]) / 2, (hp.nw[1] + hp.ne[1]) / 2]));
        ctx.lineTo(...hp.rot);
        ctx.stroke();
        for (const [k, [x, y]] of Object.entries(hp)) {
          ctx.fillStyle = k === 'rot' ? '#2a7de1' : '#fff';
          ctx.beginPath();
          if (k === 'rot') ctx.arc(x, y, 5 * px, 0, 7);
          else ctx.rect(x - 4 * px, y - 4 * px, 8 * px, 8 * px);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
    Z.onRendered && Z.onRendered();
  }

  // --- snapping
  function snapMove(el, page, side, dx, dy, start) {
    guides = [];
    const st = proj().settings;
    if (!st.snap) return [dx, dy];
    const { w: W, h: H } = dims();
    const tol = 6 / ppmCss;
    const moved = { ...el, x: start.x + dx, y: start.y + dy };
    const b = Z.aabb(moved);
    const xs = [0, st.safe, W / 2, W - st.safe, W];
    const ys = [0, st.safe, H / 2, H - st.safe, H];
    for (const o of page.elements) {
      if (S.sel.includes(o.id) || o.type === 'draw') continue;
      const ob = Z.aabb(o);
      xs.push(ob.x1, (ob.x1 + ob.x2) / 2, ob.x2);
      ys.push(ob.y1, (ob.y1 + ob.y2) / 2, ob.y2);
    }
    const best = (vals, cands) => {
      let r = null;
      for (const v of vals) for (const c of cands) { const d = c - v; if (Math.abs(d) < tol && (!r || Math.abs(d) < Math.abs(r.d))) r = { d, c }; }
      return r;
    };
    const bx = best([b.x1, (b.x1 + b.x2) / 2, b.x2], xs);
    const by = best([b.y1, (b.y1 + b.y2) / 2, b.y2], ys);
    if (bx) { dx += bx.d; guides.push({ x: bx.c + side * W }); }
    if (by) { dy += by.d; guides.push({ y: by.c }); }
    return [dx, dy];
  }

  // --- pointer handling
  function down(e) {
    if (e.button !== 0) return;
    ov.setPointerCapture(e.pointerId);
    const p = toSpread(e);
    const v = pageAt(p);
    const { w: W } = dims();
    if (v && v.idx !== S.cur && !(S.sel.length && S.tool === 'select' && hitHandle(p))) { S.cur = v.idx; Z.ui.pageChanged(); }
    if (S.tool === 'draw') {
      if (!v || v.entry.pad) return;
      live = { side: v.side, page: v.page, pts: [[p[0] - v.side * W, p[1]]], opts: { ...S.pen } };
      Z.requestRender();
      return;
    }
    if (S.tool === 'text') {
      if (!v || v.entry.pad) return;
      const el = Z.make.text({ ...S.textStyle, text: 'Your words here', x: p[0] - v.side * W, y: p[1] - 4, w: 70 });
      v.page.elements.push(el);
      S.sel = [el.id];
      Z.setTool('select');
      Z.changed(true);
      Z.ui.focusText();
      return;
    }
    // crop mode: drag pans the photo inside its frame
    if (S.cropId) {
      const f = Z.findEl(S.cropId);
      if (f && hits(f.el, sideOfPage(f.page), p)) {
        drag = { type: 'crop', el: f.el, side: sideOfPage(f.page), p0: p, ox: f.el.ox, oy: f.el.oy };
        return;
      }
      S.cropId = null;
    }
    const h = hitHandle(p);
    if (h) {
      const { el, page } = Z.selected()[0];
      drag = { type: h === 'rot' ? 'rotate' : 'resize', handle: h, el, page, side: sideOfPage(page), p0: p, start: { ...el } };
      return;
    }
    const hit = hitTest(p);
    if (hit) {
      if (e.shiftKey) S.sel = S.sel.includes(hit.el.id) ? S.sel.filter((x) => x !== hit.el.id) : [...S.sel, hit.el.id];
      else if (!S.sel.includes(hit.el.id)) S.sel = [hit.el.id];
      const items = Z.selected().map((s) => ({ el: s.el, page: s.page, x: s.el.x, y: s.el.y }));
      drag = { type: 'move', el: hit.el, page: hit.page, side: hit.side, p0: p, start: { ...hit.el }, items, moved: false };
    } else {
      S.sel = [];
    }
    Z.ui.selectionChanged();
    Z.requestRender();
  }
  function hitHandle(p) {
    if (S.sel.length !== 1 || S.cropId) return null;
    const s = Z.selected()[0];
    if (!s) return null;
    const hp = handlePoints(s.el, sideOfPage(s.page));
    for (const [k, [x, y]] of Object.entries(hp)) if (Math.hypot(p[0] - x, p[1] - y) < 7 / ppmCss) return k;
    return null;
  }
  function move(e) {
    const p = toSpread(e);
    if (live) {
      const { w: W } = dims();
      const last = live.pts[live.pts.length - 1];
      const q = [p[0] - live.side * W, p[1]];
      if (Math.hypot(q[0] - last[0], q[1] - last[1]) > 0.35) { live.pts.push(q); Z.requestRender(); }
      return;
    }
    if (!drag) {
      if (S.tool === 'select') ov.style.cursor = hitHandle(p) ? 'crosshair' : S.cropId ? 'grab' : hitTest(p) ? 'move' : 'default';
      return;
    }
    const dxy = [p[0] - drag.p0[0], p[1] - drag.p0[1]];
    const el = drag.el;
    if (drag.type === 'move') {
      if (!drag.moved && Math.hypot(...dxy) < 2 / ppmCss) return;
      drag.moved = true;
      const [dx, dy] = e.altKey ? dxy : snapMove(el, drag.page, drag.side, dxy[0], dxy[1], drag.start);
      for (const it of drag.items) { it.el.x = it.x + dx; it.el.y = it.y + dy; }
    } else if (drag.type === 'rotate') {
      const { w: W } = dims();
      const cx = drag.start.x + drag.start.w / 2 + drag.side * W, cy = drag.start.y + drag.start.h / 2;
      let a = Z.deg(Math.atan2(p[1] - cy, p[0] - cx)) + 90;
      if (e.shiftKey) a = Math.round(a / 15) * 15;
      else for (const t of [-180, -90, 0, 90, 180]) if (Math.abs(a - t) < 3) a = t;
      if (a > 180) a -= 360;
      el.rot = Math.round(a * 10) / 10;
    } else if (drag.type === 'resize') resize(drag, p, e.shiftKey);
    else if (drag.type === 'crop') {
      const a = -Z.rad(el.rot || 0);
      const lx = dxy[0] * Math.cos(a) - dxy[1] * Math.sin(a), ly = dxy[0] * Math.sin(a) + dxy[1] * Math.cos(a);
      const g = Z.photoGeom(el, proj());
      const rx = (g.dw - g.iw) / 2, ry = (g.dh - g.ih) / 2;
      const sx = el.flip ? 1 : 1;
      if (Math.abs(rx) > 0.01) el.ox = Z.clamp(drag.ox + (sx * lx) / rx, -1, 1);
      if (Math.abs(ry) > 0.01) el.oy = Z.clamp(drag.oy + ly / ry, -1, 1);
    }
    Z.changed(false, true);
  }
  function resize(d, p, keep) {
    const el = d.el, s = d.start;
    const a = Z.rad(s.rot || 0), c = Math.cos(a), sn = Math.sin(a);
    const { w: W } = dims();
    const cx = s.x + s.w / 2 + d.side * W, cy = s.y + s.h / 2;
    const dx = p[0] - cx, dy = p[1] - cy;
    const lx = dx * c + dy * sn, ly = -dx * sn + dy * c;
    let l = -s.w / 2, r = s.w / 2, t = -s.h / 2, b = s.h / 2;
    const h = d.handle;
    if (h.includes('w')) l = Math.min(lx, r - 3);
    if (h.includes('e')) r = Math.max(lx, l + 3);
    if (h.includes('n')) t = Math.min(ly, b - 3);
    if (h.includes('s')) b = Math.max(ly, t + 3);
    const corner = h.length === 2;
    if (el.type === 'text') {
      if (corner) {
        const k = (r - l) / s.w;
        el.size = Math.max(4, Math.round(s.size * k * 10) / 10);
        t = h.includes('n') ? b - s.h * k : t;
      }
    } else if ((keep || (corner && (el.type === 'sticker'))) && corner) {
      const k = Math.max((r - l) / s.w, (b - t) / s.h);
      if (h.includes('w')) l = r - s.w * k; else r = l + s.w * k;
      if (h.includes('n')) t = b - s.h * k; else b = t + s.h * k;
    }
    const nw = r - l, nh = el.type === 'text' ? el.h : b - t;
    const lcx = (l + r) / 2, lcy = el.type === 'text' ? 0 : (t + b) / 2;
    const ncx = cx + lcx * c - lcy * sn, ncy = cy + lcx * sn + lcy * c;
    el.w = nw;
    if (el.type !== 'text') el.h = nh;
    el.x = ncx - nw / 2 - d.side * W;
    el.y = ncy - el.h / 2;
  }
  function up(e) {
    if (live) {
      const st = live;
      live = null;
      if (st.pts.length) {
        const xs = st.pts.map((q) => q[0]), ys = st.pts.map((q) => q[1]);
        const x1 = Math.min(...xs), x2 = Math.max(...xs), y1 = Math.min(...ys), y2 = Math.max(...ys);
        const w = Math.max(1, x2 - x1), h = Math.max(1, y2 - y1);
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
        const el = Z.make.draw({ ...st.opts, x: cx - w / 2, y: cy - h / 2, w, h, bw: w, bh: h, pts: st.pts.map(([x, y]) => [+(x - cx).toFixed(2), +(y - cy).toFixed(2)]) });
        st.page.elements.push(el);
        Z.changed(true);
      }
      return;
    }
    if (!drag) return;
    const d = drag;
    drag = null;
    guides = [];
    if (d.type === 'move' && d.moved) crossFold(d);
    Z.changed(true);
    Z.ui.selectionChanged();
  }
  // an element dragged mostly onto the facing page moves to that page
  function crossFold(d) {
    const { w: W } = dims();
    const vis = visible();
    for (const it of d.items) {
      const side = sideOfPage(it.page);
      const cx = it.el.x + it.el.w / 2;
      const target = cx > W && side === 0 ? vis[1] : cx < 0 && side === 1 ? vis[0] : null;
      if (!target || target.entry.pad) continue;
      it.page.elements = it.page.elements.filter((x) => x !== it.el);
      it.el.x += side === 0 ? -W : W;
      target.page.elements.push(it.el);
      S.cur = target.idx;
    }
  }
  function dbl(e) {
    const hit = hitTest(toSpread(e));
    if (!hit) return;
    S.sel = [hit.el.id];
    if (hit.el.type === 'photo' && hit.el.photoId) { S.cropId = hit.el.id; Z.toast('Crop: drag to move the photo in its frame, scroll to zoom. Esc when done.'); }
    else if (hit.el.type === 'text') Z.ui.focusText();
    Z.ui.selectionChanged();
    Z.requestRender();
  }
  function wheel(e) {
    if (S.cropId) {
      const f = Z.findEl(S.cropId);
      if (f) {
        e.preventDefault();
        f.el.zoom = Z.clamp(f.el.zoom * (e.deltaY < 0 ? 1.06 : 1 / 1.06), f.el.fit === 'contain' ? 0.3 : 1, 8);
        Z.changed(false, true);
        Z.ui.selectionChanged();
        return;
      }
    }
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      Z.setZoom(S.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
    }
  }
  Z.setZoom = (z) => {
    S.zoom = Z.clamp(z, 0.4, 6);
    Z.$('#zoomLabel').textContent = Math.round(S.zoom * 100) + '%';
    Z.requestRender();
  };

  // --- photos dropped from the tray or from the computer
  async function dropOn(e) {
    e.preventDefault();
    const p = toSpread(e);
    const v = pageAt(p);
    const id = e.dataTransfer.getData('application/x-zine-photo');
    if (id) {
      if (!v || v.entry.pad) return Z.toast('Drop photos on a page.');
      Z.placePhoto(id, v, p);
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      const added = await Z.ui.importFiles([...e.dataTransfer.files]);
      if (added.length && v && !v.entry.pad) Z.placePhoto(added[0].id, v, p);
    }
  }
  // Put a photo on a page: into the frame under the point, else the first empty frame
  // (when no point is given), else a new frame.
  Z.placePhoto = (photoId, v, p) => {
    const { w: W, h: H } = dims();
    v = v || visible()[Z.curSpread().indexOf(S.cur)];
    if (!v || v.entry.pad) return Z.toast('Pick a page first.');
    let target = null;
    if (p) {
      for (let i = v.page.elements.length - 1; i >= 0; i--) {
        const el = v.page.elements[i];
        if (el.type === 'photo' && hits(el, v.side, p)) { target = el; break; }
      }
    } else target = v.page.elements.find((el) => el.type === 'photo' && !el.photoId);
    if (target) Object.assign(target, { photoId, zoom: 1, ox: 0, oy: 0 });
    else {
      const rec = Z.findPhoto(proj(), photoId);
      let w = W * 0.55, h = rec ? (w * rec.h) / rec.w : w * 0.75;
      if (h > H * 0.6) { h = H * 0.6; if (rec) w = (h * rec.w) / rec.h; }
      const cx = p ? p[0] - v.side * W : W / 2, cy = p ? p[1] : H / 2;
      target = Z.make.photo({ photoId, x: cx - w / 2, y: cy - h / 2, w, h });
      v.page.elements.push(target);
    }
    S.sel = [target.id];
    S.cur = v.idx;
    Z.changed(true);
    Z.ui.selectionChanged();
  };

  Z.setTool = (t) => {
    S.tool = t;
    S.cropId = null;
    Z.$$('[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
    ov.style.cursor = t === 'draw' ? 'crosshair' : t === 'text' ? 'text' : 'default';
    Z.ui.toolChanged && Z.ui.toolChanged();
    Z.requestRender();
  };
})();
