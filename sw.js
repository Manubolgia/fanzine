// Offline support: the app's files are kept on the device so the editor opens without internet.
// Fonts never change, so they come straight from the cache. Everything else is fetched fresh
// when online (so updates arrive on the next open) and falls back to the cache when offline.
// Only this site's own files pass through here; sync requests to GitHub are never cached.
'use strict';
const CACHE = 'fanzine-v2';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css', 'fonts/fonts.css',
  'js/core.js', 'js/fonts.js', 'js/model.js', 'js/layouts.js', 'js/store.js', 'js/sync.js', 'js/photos.js',
  'js/art.js', 'js/render.js', 'js/pdf.js', 'js/guide.js', 'js/preview.js', 'js/ui.js', 'js/editor.js', 'js/app.js',
  'icons/icon-192.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  const keep = (res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  };
  if (url.pathname.endsWith('.woff2')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(keep)));
    return;
  }
  e.respondWith(fetch(url.href, { cache: 'no-cache' }).then(keep).catch(async () =>
    (await caches.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' && (await caches.match('./'))) || Response.error()));
});
