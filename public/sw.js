// World War Rogue service worker.
//
// Build files under /assets/ carry a content hash in their filename
// (index-Ab12Cd34.js), so they are immutable: serve them from cache and only
// hit the network on a miss. Everything else - navigations, the manifest,
// the icons, and the asset ART under /assets/<id>/rNN.webp, which is NOT
// hashed - goes to the network first, so a new deployment is picked up on
// the next load rather than being pinned to a stale copy. The cache is only
// consulted when the network fails.
//
// v3: v2 cached the art as if it were hashed, so a phone that had seen an
// asset once never saw it redrawn. Bumping the name drops that cache.
const CACHE = 'wwr-v3';

/** A Vite build file: one path segment under /assets/ with a hash suffix. */
const HASHED = /^\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.[a-z0-9]+$/;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await caches.match('/');
      if (shell) return shell;
    }
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const {request} = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(HASHED.test(url.pathname) ? cacheFirst(request) : networkFirst(request));
});
