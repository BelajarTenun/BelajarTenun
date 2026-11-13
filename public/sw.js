// Service worker: cache tampilan aplikasi agar tetap terbuka saat sinyal lemah (F8).
// API & video rekaman selalu lewat jaringan (data belajar tidak di-cache).
const CACHE = 'bt-shell-v5';
const SHELL = ['/', '/index.html', '/app.js', '/style.css', '/icon.svg', '/manifest.webmanifest',
  '/js/api.js', '/js/tutor.js', '/js/quality.js', '/js/earcons.js', '/js/tracer.js', '/js/cards.js', '/js/live.js', '/js/sources.js', '/js/rtc.js', '/js/local-model.js', '/js/livekit-tutor.js', '/vendor/livekit-client/livekit-client.esm.mjs'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/recordings/')) return;
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
