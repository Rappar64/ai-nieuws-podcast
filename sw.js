// Service worker voor de AI Nieuws-webapp.
// - App-schil (HTML, iconen) wordt bewaard, zodat de app ook zonder netwerk opent.
// - index.html en episodes.json: eerst netwerk (altijd vers), anders de bewaarde versie.
// - mp3's laten we met rust: die streamt de browser zelf (met range-requests).
const VERSION = 'ainieuws-v1';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/cover-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('.mp3') || url.pathname.endsWith('.xml')) return;

  const networkFirst = req.mode === 'navigate' || url.pathname.endsWith('/') ||
    url.pathname.endsWith('index.html') || url.pathname.endsWith('episodes.json');

  if (networkFirst) {
    const cacheKey = url.pathname.endsWith('episodes.json') ? 'episodes.json' : 'index.html';
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(cacheKey, copy));
          }
          return res;
        })
        .catch(() => caches.match(cacheKey).then((r) => r || caches.match('./')))
    );
    return;
  }

  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
