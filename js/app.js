// State, undo/redo, autosave, keyboard shortcuts and start-up.
'use strict';
Object.assign(Z.state, {
  project: null, cur: 0, sel: [], tool: 'select', zoom: 1, cropId: null, clip: null,
  pen: { color: '#222222', width: 0.8, brush: 'pen' },
  textStyle: { font: 'Caveat', size: 22, color: '#222222' },
});

Z.history = (() => {
  let undo = [], redo = [], last = null;
  const snap = () => JSON.stringify(Z.state.project);
  const restore = (json) => {
    Z.state.project = JSON.parse(json);
    Z.state.cropId = null;
    Z.state.sel = Z.state.sel.filter((id) => Z.findEl(id));
    Z.state.cur = Z.clamp(Z.state.cur, 0, Z.flat(Z.state.project).length - 1);
    Z.ui.refreshAll();
    Z.requestRender();
    Z.autosave();
  };
  return {
    reset() { undo = []; redo = []; last = snap(); Z.history.buttons(); },
    commit() {
      const cur = snap();
      if (cur === last) return;
      undo.push(last);
      if (undo.length > 120) undo.shift();
      redo = [];
      last = cur;
      Z.history.buttons();
      Z.autosave();
    },
    undo() {
      Z.pendingCommit.flush();
      if (!undo.length) return;
      redo.push(last);
      last = undo.pop();
      restore(last);
      Z.history.buttons();
    },
    redo() {
      if (!redo.length) return;
      undo.push(last);
      last = redo.pop();
      restore(last);
      Z.history.buttons();
    },
    buttons() {
      const u = Z.$('#undoBtn'), r = Z.$('#redoBtn');
      if (u) u.disabled = !undo.length;
      if (r) r.disabled = !redo.length;
    },
  };
})();

Z.pendingCommit = Z.debounce(() => Z.history.commit(), 450);
// Call after any change. commit=true records an undo step now; quick=true means mid-drag (no panel refresh).
Z.changed = (commit, quick) => {
  Z.requestRender();
  if (!quick) Z.ui.refreshLight();
  if (commit) {
    Z.pendingCommit.flush();
    Z.history.commit();
  } else if (!quick) Z.pendingCommit();
};

const saveNow = async () => {
  try {
    await Z.store.saveProject(Z.state.project);
    const s = Z.$('#saveState');
    if (s) s.textContent = 'Saved in this browser · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    Z.toast('Could not autosave: ' + e.message, 6000);
  }
};
Z.autosave = Z.debounce(saveNow, 1000);
window.addEventListener('beforeunload', () => { Z.pendingCommit.flush(); Z.autosave.flush(); });

Z.loadProject = (p) => {
  Z.state.project = p;
  Z.state.cur = 0;
  Z.state.sel = [];
  Z.state.cropId = null;
  Z.history.reset();
  Z.ui.refreshAll();
  Z.requestRender();
  saveNow();
};

// --- element operations used by the keyboard and the panels
Z.ops = {
  remove() {
    for (const { el, page } of Z.selected()) page.elements = page.elements.filter((x) => x !== el);
    Z.state.sel = [];
    Z.state.cropId = null;
    Z.changed(true);
    Z.ui.selectionChanged();
  },
  duplicate() {
    const ids = [];
    for (const { el, page } of Z.selected()) {
      const c = { ...Z.clone(el), id: Z.uid(), x: el.x + 5, y: el.y + 5 };
      delete c.slot;
      page.elements.push(c);
      ids.push(c.id);
    }
    Z.state.sel = ids;
    Z.changed(true);
    Z.ui.selectionChanged();
  },
  copy() {
    Z.state.clip = Z.selected().map((s) => Z.clone(s.el));
    if (Z.state.clip.length) Z.toast(`Copied ${Z.state.clip.length} item${Z.state.clip.length > 1 ? 's' : ''}`);
  },
  paste() {
    const e = Z.curEntry();
    if (!Z.state.clip || !Z.state.clip.length || e.pad) return;
    const ids = [];
    for (const src of Z.state.clip) {
      const c = { ...Z.clone(src), id: Z.uid() };
      delete c.slot;
      if (e.page.elements.some((x) => x.x === c.x && x.y === c.y)) { c.x += 5; c.y += 5; }
      e.page.elements.push(c);
      ids.push(c.id);
    }
    Z.state.sel = ids;
    Z.changed(true);
    Z.ui.selectionChanged();
  },
  layer(where) {
    for (const { el, page } of Z.selected()) {
      const arr = page.elements, i = arr.indexOf(el);
      arr.splice(i, 1);
      const j = where === 'front' ? arr.length : where === 'back' ? 0 : where === 'up' ? Math.min(arr.length, i + 1) : Math.max(0, i - 1);
      arr.splice(j, 0, el);
    }
    Z.changed(true);
  },
  nudge(dx, dy) {
    for (const { el } of Z.selected()) { el.x += dx; el.y += dy; }
    Z.changed(false);
  },
};

document.addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? Z.history.redo() : Z.history.undo(); return; }
  if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); Z.history.redo(); return; }
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); Z.ui.saveFile(); return; }
  if (typing && e.key === 'Escape') { e.target.blur(); return; }
  if (typing || Z.$('.modal.open')) { if (e.key === 'Escape') Z.ui.closeModals(); return; }
  if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); Z.ops.duplicate(); return; }
  if (mod && e.key.toLowerCase() === 'c') { Z.ops.copy(); return; }
  if (mod && e.key.toLowerCase() === 'v') { Z.ops.paste(); return; }
  const k = e.key;
  if (k === 'Delete' || k === 'Backspace') { if (Z.state.sel.length) { e.preventDefault(); Z.ops.remove(); } return; }
  if (k === 'Escape') {
    if (Z.state.cropId) Z.state.cropId = null;
    else if (Z.state.tool !== 'select') Z.setTool('select');
    else Z.state.sel = [];
    Z.ui.selectionChanged();
    Z.requestRender();
    return;
  }
  if (k.startsWith('Arrow') && Z.state.sel.length) {
    e.preventDefault();
    const s = e.shiftKey ? 5 : 0.5;
    Z.ops.nudge(k === 'ArrowLeft' ? -s : k === 'ArrowRight' ? s : 0, k === 'ArrowUp' ? -s : k === 'ArrowDown' ? s : 0);
    return;
  }
  if (k === 'PageDown' || (k === 'ArrowRight' && !Z.state.sel.length)) { Z.ui.goSpread(1); return; }
  if (k === 'PageUp' || (k === 'ArrowLeft' && !Z.state.sel.length)) { Z.ui.goSpread(-1); return; }
  if (k === 'v' || k === 'V') Z.setTool('select');
  if (k === 'p' || k === 'P') Z.setTool('draw');
  if (k === 't' || k === 'T') Z.setTool('text');
  if (k === ']') Z.ops.layer(e.shiftKey ? 'front' : 'up');
  if (k === '[') Z.ops.layer(e.shiftKey ? 'back' : 'down');
});

window.addEventListener('DOMContentLoaded', async () => {
  Z.ui.init();
  Z.initEditor();
  let p = null;
  try { p = await Z.store.loadProject(); } catch (e) { Z.toast('Could not read the autosave: ' + e.message, 6000); }
  Z.loadProject(p || Z.newProject('A6'));
  if (!p) Z.ui.openNew(true);
  if (document.fonts) {
    document.fonts.addEventListener('loadingdone', () => { Z.requestRender(); Z.ui.refreshLight(); });
    Z.fontsReady.then(() => { Z.requestRender(); Z.ui.refreshLight(); Z.ui.fontsLoaded && Z.ui.fontsLoaded(); });
  }
});
