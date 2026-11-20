// Local storage: the project and the photos live in this browser's IndexedDB, never online.
// A project can also be saved to / opened from a single .zine file (JSON + photo files).
'use strict';
Z.db = (() => {
  let dbp = null;
  const open = () =>
    (dbp ||= new Promise((res, rej) => {
      const r = indexedDB.open('fanzine-editor', 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore('kv');
        r.result.createObjectStore('blobs');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
  const tx = async (store, mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode);
      const st = t.objectStore(store);
      let out;
      Promise.resolve(fn(st)).then((v) => (out = v));
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  };
  const req = (r) => new Promise((res, rej) => ((r.onsuccess = () => res(r.result)), (r.onerror = () => rej(r.error))));
  return {
    get: (store, key) => tx(store, 'readonly', (st) => req(st.get(key))),
    put: (store, key, val) => tx(store, 'readwrite', (st) => req(st.put(val, key))),
    del: (store, key) => tx(store, 'readwrite', (st) => req(st.delete(key))),
    keys: (store) => tx(store, 'readonly', (st) => req(st.getAllKeys())),
    clear: (store) => tx(store, 'readwrite', (st) => req(st.clear())),
  };
})();

Z.store = {
  async saveProject(p) {
    await Z.db.put('kv', 'project', JSON.stringify(p));
    await Z.db.put('kv', 'savedAt', Date.now());
  },
  async loadProject() {
    const s = await Z.db.get('kv', 'project');
    return s ? JSON.parse(s) : null;
  },
  putBlob: (key, blob) => Z.db.put('blobs', key, blob),
  getBlob: (key) => Z.db.get('blobs', key),

  // Remove photo files that no project photo refers to any more.
  async gc(p) {
    const live = new Set(p.photos.map((x) => x.id));
    for (const k of await Z.db.keys('blobs')) if (!live.has(String(k).split(':')[0])) await Z.db.del('blobs', k);
  },

  // .zine file: "FANZINE1" + 4-byte JSON length + JSON + the photo files back to back.
  async exportFile(p) {
    const parts = [];
    const manifest = [];
    for (const ph of p.photos) {
      for (const kind of ['full', 'prev', 'thumb']) {
        const b = await Z.store.getBlob(ph.id + ':' + kind);
        if (!b) continue;
        manifest.push({ key: ph.id + ':' + kind, size: b.size, type: b.type });
        parts.push(b);
      }
    }
    const json = new TextEncoder().encode(JSON.stringify({ project: p, manifest }));
    const head = new Uint8Array(12);
    head.set(new TextEncoder().encode('FANZINE1'));
    new DataView(head.buffer).setUint32(8, json.length);
    return new Blob([head, json, ...parts], { type: 'application/octet-stream' });
  },
  async importFile(file) {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (new TextDecoder().decode(head.slice(0, 8)) !== 'FANZINE1') throw new Error('This is not a .zine project file.');
    const len = new DataView(head.buffer).getUint32(8);
    const { project, manifest } = JSON.parse(new TextDecoder().decode(await file.slice(12, 12 + len).arrayBuffer()));
    let off = 12 + len;
    await Z.db.clear('blobs');
    for (const m of manifest) {
      await Z.store.putBlob(m.key, file.slice(off, off + m.size, m.type));
      off += m.size;
    }
    return project;
  },
};
