// ClemsonFit Service Worker
// Bump this version string whenever you deploy an update — it forces cache refresh
const CACHE_VERSION = 'clemsonfit-v1.0.1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Google Fonts — cached on first load
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600&display=swap',
];

// ── INSTALL: pre-cache static shell ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      // Cache what we can; don't fail install if a font request errors
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: remove old caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: network-first for API, cache-first for assets ──────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // ── Dining Hall API: network-first, fallback to cache ──
  // When you wire up a real dining API, add its hostname here
  // e.g. 'api.clemson.edu' or 'dineoncampus.com'
  const DINING_API_HOSTS = [
    'api.dineoncampus.com',
    'clemson.campusdish.com',
    // add your API host here when ready
  ];

  if (DINING_API_HOSTS.some(h => url.hostname.includes(h))) {
    event.respondWith(networkFirstWithCache(request, 'dining-api-cache'));
    return;
  }

  // ── External fonts/CDN: cache-first ──
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ── App shell & static files: cache-first ──
  if (request.method === 'GET') {
    event.respondWith(cacheFirst(request));
  }
});

// ── Strategy: cache-first, fallback to network ───────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline fallback — return app shell for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    return new Response('Offline', { status: 503 });
  }
}

// ── Strategy: network-first, cache as backup ─────────────────
async function networkFirstWithCache(request, cacheName = CACHE_VERSION) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ── Background sync placeholder ───────────────────────────────
// When you add Supabase, queue failed writes here and replay on reconnect
self.addEventListener('sync', event => {
  if (event.tag === 'sync-logs') {
    event.waitUntil(syncPendingLogs());
  }
});

async function syncPendingLogs() {
  // TODO: read from IndexedDB queue, POST to Supabase, clear queue
  console.log('[SW] Background sync: syncPendingLogs (stub)');
}

