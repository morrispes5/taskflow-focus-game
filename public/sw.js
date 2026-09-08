const CACHE = 'taskflow-v5';
const PRECACHE = [
  './',
  './index.html',
  './tasks.html',
  './focus.html',
  './calendar.html',
  './analytics.html',
  './settings.html',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => undefined)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

// Isi /assets/ tidak pernah berubah untuk URL yang sama: bundle hasil build
// memakai hash pada namanya, dan aset media diganti bersamaan dengan naiknya
// nama CACHE. Mengambilnya dari jaringan setiap navigasi hanya membuang kuota.
function isImmutableAsset(url) {
  return url.pathname.includes('/assets/');
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }
  // Permintaan lintas-origin dibiarkan apa adanya; TaskFlow tidak menyimpannya.
  if (url.origin !== self.location.origin) return;
  event.respondWith(isImmutableAsset(url) ? cacheFirst(event.request) : networkFirst(event.request));
});
