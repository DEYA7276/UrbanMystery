const STATIC = 'urban-static-v7', DYNAMIC = 'urban-dynamic-v3';
const SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './data/cases.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== STATIC && k !== DYNAMIC).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;

  // Network-First strategy: always fetch latest version when online, fallback to cache when offline
  e.respondWith((async () => {
    try {
      const networkRes = await fetch(r);
      if (networkRes.ok) {
        const cache = await caches.open(DYNAMIC);
        await cache.put(r, networkRes.clone());
        return networkRes;
      }
    } catch (err) {
      // Network failed or offline: fall back to cache
    }

    const cachedHit = await caches.match(r);
    if (cachedHit) return cachedHit;

    if (r.mode === 'navigate') {
      return (await caches.match('./index.html')) || Response.error();
    }

    return Response.error();
  })());
});
