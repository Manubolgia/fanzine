// Private sync between your devices through a private GitHub repository you own.
// Everything is encrypted on this device before it leaves (AES-GCM, with a key made from your
// passphrase), so the repository only ever holds unreadable data. The passphrase is never stored
// or sent anywhere; each device keeps only the derived key, which cannot be read back out.
//
// In the repository:
//   fanzine.json      the passphrase check (salt and an encrypted test word, nothing private)
//   data/state.bin    encrypted: the project
//   data/index.bin    encrypted: which pack holds which photo file
//   data/packs/*.bin  encrypted bundles of photo files (a few MB each, never changed once written)
'use strict';
Z.sync = (() => {
  const KINDS = ['full', 'prev', 'thumb'];
  const PACK_MAX = 6e6;
  const ITER = 600000;
  const META = 'fanzine.json', STATE = 'data/state.bin', INDEX = 'data/index.bin';
  const MAGIC = new TextEncoder().encode('FZE1');
  const api = { base: 'https://api.github.com' };
  let cfg = null; // { repo, branch, token, key, lastLocal, lastRemote, at }
  let busy = null;
  let status = { kind: 'off', text: 'Sync is off' };

  // ---------- small helpers
  const te = new TextEncoder(), td = new TextDecoder();
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const blobB64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  const sha256 = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
  // What counts as a change. Text boxes re-measure their height whenever they are drawn, and
  // devices measure fonts a hair differently, so that height is left out (or two devices would
  // keep re-uploading the same zine to each other).
  const fingerprint = (p) => sha256(JSON.stringify(p, (k, v) => (v && v.type === 'text' && 'h' in v ? { ...v, h: 0 } : v)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const saveCfg = () => Z.db.put('kv', 'sync', cfg);
  const setStatus = (kind, text) => { status = { kind, text }; Z.ui.syncStatus && Z.ui.syncStatus(status); };

  // ---------- encryption
  const deriveKey = async (pass, salt, iter) => {
    const base = await crypto.subtle.importKey('raw', te.encode(pass.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  };
  const encrypt = async (key, data) => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    return new Blob([MAGIC, iv, await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)]);
  };
  const decrypt = async (key, buf) => {
    const u = new Uint8Array(buf);
    if (td.decode(u.subarray(0, 4)) !== 'FZE1') throw new Error('A file in the sync repository is not in the expected format.');
    try {
      return await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.subarray(4, 16) }, key, u.subarray(16));
    } catch (e) {
      throw new Error('Could not decrypt the synced data: the passphrase on this device does not match.');
    }
  };

  // ---------- GitHub
  async function gh(path, { method = 'GET', body, raw } = {}, tries = 0) {
    let r;
    try {
      r = await fetch(api.base + path, {
        method,
        cache: 'no-store',
        headers: {
          Authorization: 'Bearer ' + cfg.token,
          Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      const err = new Error(navigator.onLine === false ? 'You are offline.' : 'Could not reach GitHub.');
      err.offline = true;
      throw err;
    }
    if ((r.status === 403 || r.status === 429) && tries < 3 && (r.headers.get('Retry-After') || r.headers.get('X-RateLimit-Remaining') === '0')) {
      await wait(Math.min(60, +(r.headers.get('Retry-After') || 20)) * 1000);
      return gh(path, { method, body, raw }, tries + 1);
    }
    if (!r.ok) {
      let msg = '';
      try { msg = (await r.json()).message || ''; } catch (e) {}
      const err = new Error(
        r.status === 401 ? 'GitHub did not accept the token (it may have expired). Set up sync again with a new token.'
          : r.status === 404 ? `GitHub could not find ${cfg.repo}, or the token is not allowed to use it.`
          : r.status === 403 ? 'The token is not allowed to write to the repository (it needs Contents: Read and write).'
          : `GitHub said: ${r.status} ${msg}`);
      err.status = r.status;
      throw err;
    }
    if (raw) return r.arrayBuffer();
    return r.status === 204 ? null : r.json();
  }
  const R = () => `/repos/${cfg.repo}`;
  async function remoteHead() {
    const ref = await gh(`${R()}/git/ref/heads/${cfg.branch}`);
    const commit = await gh(`${R()}/git/commits/${ref.object.sha}`);
    const tree = await gh(`${R()}/git/trees/${commit.tree.sha}?recursive=1`);
    const files = new Map(tree.tree.filter((t) => t.type === 'blob').map((t) => [t.path, t.sha]));
    return { head: ref.object.sha, tree: commit.tree.sha, files };
  }
  const getFile = (sha) => gh(`${R()}/git/blobs/${sha}`, { raw: true });
  const putBlob = async (blob) => (await gh(`${R()}/git/blobs`, { method: 'POST', body: { content: await blobB64(blob), encoding: 'base64' } })).sha;
  // Commits the entries on top of rs and moves the branch; rs is updated to the new commit.
  async function commit(rs, entries, message) {
    const tree = await gh(`${R()}/git/trees`, { method: 'POST', body: { base_tree: rs.tree, tree: entries } });
    const c = await gh(`${R()}/git/commits`, { method: 'POST', body: { message, tree: tree.sha, parents: [rs.head] } });
    await gh(`${R()}/git/refs/heads/${cfg.branch}`, { method: 'PATCH', body: { sha: c.sha, force: false } });
    for (const e of entries) e.sha ? rs.files.set(e.path, e.sha) : rs.files.delete(e.path);
    Object.assign(rs, { head: c.sha, tree: tree.sha });
  }
  const readEnc = async (rs, path) => {
    const sha = rs.files.get(path);
    return sha ? JSON.parse(td.decode(await decrypt(cfg.key, await getFile(sha)))) : null;
  };
  const encEntry = async (path, obj) => ({ path, mode: '100644', type: 'blob', sha: await putBlob(await encrypt(cfg.key, te.encode(JSON.stringify(obj)))) });

  // pack: "FZPK" + 4-byte JSON length + JSON [{key, size, type}] + the files back to back
  const makePack = async (items) => {
    const json = te.encode(JSON.stringify(items.map((x) => ({ key: x.key, size: x.blob.size, type: x.blob.type || 'image/jpeg' }))));
    const head = new Uint8Array(8);
    head.set(te.encode('FZPK'));
    new DataView(head.buffer).setUint32(4, json.length);
    return new Uint8Array(await new Blob([head, json, ...items.map((x) => x.blob)]).arrayBuffer());
  };
  const readPack = (buf) => {
    const u = new Uint8Array(buf);
    if (td.decode(u.subarray(0, 4)) !== 'FZPK') throw new Error('A photo bundle in the sync repository is damaged.');
    const len = new DataView(u.buffer, u.byteOffset).getUint32(4);
    const list = JSON.parse(td.decode(u.subarray(8, 8 + len)));
    let off = 8 + len;
    return list.map((m) => { const b = new Blob([u.subarray(off, off + m.size)], { type: m.type }); off += m.size; return { key: m.key, blob: b }; });
  };
  const photoKeys = (p) => p.photos.flatMap((ph) => KINDS.map((k) => ph.id + ':' + k));
  // which pack holds which photo file; packs whose file is gone are dropped
  const readIndex = async (rs) => {
    const packs = {};
    for (const [path, keys] of Object.entries(((await readEnc(rs, INDEX)) || {}).packs || {})) if (rs.files.has(path)) packs[path] = keys;
    return packs;
  };

  // ---------- push and pull
  // Uploads the photo files the repository lacks (committing every few packs, so a long first
  // upload that gets interrupted resumes where it stopped), then the project itself.
  async function push(rs, json, hash) {
    const project = JSON.parse(json);
    const packs = await readIndex(rs);
    const have = new Set(Object.values(packs).flat());
    const need = [];
    for (const key of photoKeys(project)) {
      if (have.has(key)) continue;
      const blob = await Z.store.getBlob(key);
      if (blob) need.push({ key, blob });
    }
    const total = need.reduce((a, x) => a + x.blob.size, 0);
    let sent = 0, entries = [];
    while (need.length) {
      const batch = [];
      let size = 0;
      while (need.length && (!batch.length || size + need[0].blob.size <= PACK_MAX)) { size += need[0].blob.size; batch.push(need.shift()); }
      setStatus('busy', `Uploading photos ${Math.round((sent / total) * 100)}%`);
      const path = `data/packs/${Date.now().toString(36)}-${Z.uid()}.bin`;
      entries.push({ path, mode: '100644', type: 'blob', sha: await putBlob(await encrypt(cfg.key, await makePack(batch))) });
      packs[path] = batch.map((x) => x.key);
      sent += size;
      if (entries.length >= 5 && need.length) {
        await commit(rs, [...entries, await encEntry(INDEX, { packs })], 'Sync photos');
        entries = [];
      }
    }
    const live = new Set(photoKeys(project));
    for (const [path, keys] of Object.entries(packs)) {
      if (keys.some((k) => live.has(k))) continue;
      entries.push({ path, mode: '100644', type: 'blob', sha: null });
      delete packs[path];
    }
    setStatus('busy', 'Saving…');
    entries.push(await encEntry(INDEX, { packs }));
    entries.push(await encEntry(STATE, { v: 1, hash, savedAt: new Date().toISOString(), project }));
    await commit(rs, entries, 'Sync');
    Object.assign(cfg, { lastLocal: hash, lastRemote: hash, at: Date.now(), head: rs.head });
    await saveCfg();
  }

  // Downloads the photo files of `project` that this device lacks.
  async function fetchPhotos(rs, project) {
    const where = {};
    for (const [path, keys] of Object.entries(await readIndex(rs))) for (const k of keys) where[k] = path;
    const want = new Map();
    for (const key of photoKeys(project)) {
      if (!where[key] || (await Z.store.getBlob(key))) continue;
      if (!want.has(where[key])) want.set(where[key], new Set());
      want.get(where[key]).add(key);
    }
    let done = 0;
    for (const [path, keys] of want) {
      setStatus('busy', `Downloading photos ${Math.round((done / want.size) * 100)}%`);
      for (const { key, blob } of readPack(await decrypt(cfg.key, await getFile(rs.files.get(path))))) if (keys.has(key)) await Z.store.putBlob(key, blob);
      done++;
    }
    if (done) { await Z.photos.forgetMissing(); Z.ui.refreshAll(); Z.requestRender(); }
  }
  async function pull(rs, remote, localHashBefore) {
    await fetchPhotos(rs, remote.project);
    Z.pendingCommit.flush();
    if ((await fingerprint(Z.state.project)) !== localHashBefore) return false; // edited meanwhile: try again
    Z.loadProject(remote.project);
    const localHash = await fingerprint(Z.state.project);
    Object.assign(cfg, { lastLocal: localHash, lastRemote: remote.hash, at: Date.now(), head: rs.head });
    await saveCfg();
    return true;
  }

  async function runOnce(reason) {
    Z.pendingCommit.flush();
    setStatus('busy', 'Syncing…');
    const rs = await remoteHead();
    const json = JSON.stringify(Z.state.project);
    const localHash = await fingerprint(Z.state.project);
    const localChanged = localHash !== cfg.lastLocal;
    if (rs.head === cfg.head && cfg.lastRemote) {
      // nobody else saved since our last sync
      if (!localChanged) return 'same';
      await push(rs, json, localHash);
      return 'pushed';
    }
    const remote = await readEnc(rs, STATE);
    if (!remote) { await push(rs, json, localHash); return 'pushed'; }
    const remoteChanged = remote.hash !== cfg.lastRemote;
    if (remote.hash === localHash || (!localChanged && !remoteChanged)) {
      await fetchPhotos(rs, remote.project);
      Object.assign(cfg, { lastLocal: localHash, lastRemote: remote.hash, at: Date.now(), head: rs.head });
      await saveCfg();
      return 'same';
    }
    if (localChanged && !remoteChanged) { await push(rs, json, localHash); return 'pushed'; }
    if (!localChanged) return (await pull(rs, remote, localHash)) ? 'pulled' : 'retry';
    const choice = await Z.ui.syncConflict({ first: !cfg.lastRemote, remote, local: Z.state.project, reason });
    if (choice === 'remote') return (await pull(rs, remote, localHash)) ? 'pulled' : 'retry';
    if (choice === 'local') { await push(rs, json, localHash); return 'pushed'; }
    return 'later';
  }

  async function run(reason = 'manual') {
    if (!cfg || !cfg.key) return null;
    if (busy) return busy;
    busy = (async () => {
      try {
        let out;
        for (let i = 0; i < 3; i++) {
          try {
            out = await runOnce(reason);
          } catch (e) {
            if (e.status === 422 && i < 2) { out = 'retry'; continue; } // the other device saved at the same moment
            throw e;
          }
          if (out !== 'retry') break;
        }
        if (out === 'later') setStatus('warn', 'Not synced: choose a version');
        else setStatus('ok', 'Synced ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        if (out === 'pulled') Z.toast('Loaded the newer version from your other device.');
        return out;
      } catch (e) {
        console.error(e);
        setStatus(e.offline ? 'offline' : 'error', e.offline ? 'Offline: will sync later' : 'Sync problem');
        if (!e.offline && reason === 'manual') Z.toast(e.message, 7000);
        status.error = e.message;
        return 'error';
      } finally {
        busy = null;
        if (dirty) { dirty = false; changed(); }
      }
    })();
    return busy;
  }
  // After each save on this device: schedule a sync if the zine differs from the synced one.
  let dirty = false;
  async function changed() {
    if (!cfg || !cfg.key) return;
    if (busy) { dirty = true; return; }
    if ((await fingerprint(Z.state.project)) === cfg.lastLocal) return;
    setStatus('pending', 'Changes not synced yet');
    soon();
  }

  // ---------- setup
  // Step 1: check the repository and the token. Returns { hasData } (true when a passphrase exists).
  async function connect(repo, token) {
    repo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('Write the repository as owner/name, for example jane/fanzine-data.');
    if (!crypto.subtle) throw new Error('This browser blocks encryption on this page. Open the app from its https:// address.');
    cfg = { repo, token: token.trim() };
    const info = await gh(R());
    if (!info.private) { cfg = null; throw new Error(`${repo} is public. Make it private on GitHub first (Settings, then Change visibility), so nobody else can see it.`); }
    cfg.branch = info.default_branch || 'main';
    try {
      const rs = await remoteHead();
      return { hasData: rs.files.has(META) };
    } catch (e) {
      if (e.status === 409) return { hasData: false, empty: true }; // a brand-new empty repository
      throw e;
    }
  }
  // Step 2: create (first device) or check (other devices) the passphrase, then sync.
  async function unlock(pass, create) {
    if (create) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await deriveKey(pass, salt, ITER);
      const meta = { app: 'fanzine', v: 1, kdf: { name: 'PBKDF2-SHA256', iter: ITER, salt: b64(salt) }, check: b64(new Uint8Array(await (await encrypt(key, te.encode('fanzine-ok'))).arrayBuffer())) };
      const content = b64(te.encode(JSON.stringify(meta, null, 1)));
      let existing = null;
      try { existing = (await gh(`${R()}/contents/${META}?ref=${cfg.branch}`)).sha; } catch (e) { if (e.status !== 404) throw e; }
      if (existing) throw new Error('This repository already has a passphrase. Use “I already have a passphrase”.');
      await gh(`${R()}/contents/${META}`, { method: 'PUT', body: { message: 'Set up encrypted sync', content, branch: cfg.branch } });
      cfg.key = key;
    } else {
      const rs = await remoteHead();
      const meta = JSON.parse(td.decode(await getFile(rs.files.get(META))));
      const key = await deriveKey(pass, unb64(meta.kdf.salt), meta.kdf.iter);
      let ok = false;
      try { ok = td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(meta.check).subarray(4, 16) }, key, unb64(meta.check).subarray(16))) === 'fanzine-ok'; } catch (e) {}
      if (!ok) throw new Error('That passphrase does not match the one used on your other device.');
      cfg.key = key;
    }
    Object.assign(cfg, { lastLocal: null, lastRemote: null, head: null, at: null });
    await saveCfg();
    setStatus('ok', 'Sync is on');
    return run('setup');
  }
  async function disconnect() {
    cfg = null;
    await Z.db.del('kv', 'sync');
    setStatus('off', 'Sync is off');
  }

  // ---------- automatic syncing
  const soon = Z.debounce(() => run('auto'), 8000);
  async function init() {
    try { cfg = (await Z.db.get('kv', 'sync')) || null; } catch (e) { cfg = null; }
    if (!cfg || !cfg.key) { cfg = null; setStatus('off', 'Sync is off'); return; }
    setStatus('ok', 'Sync is on');
    run('open');
    document.addEventListener('visibilitychange', () => cfg && run('auto'));
    window.addEventListener('online', () => cfg && run('auto'));
  }

  return {
    api, init, run, connect, unlock, disconnect,
    changed,
    configured: () => !!(cfg && cfg.key),
    info: () => (cfg ? { repo: cfg.repo, at: cfg.at } : null),
    status: () => status,
  };
})();
