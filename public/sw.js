// JACHAI Service Worker for Offline & Low-Connectivity Admission Study
const CACHE_NAME = 'jachai-offline-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Do not cache backend mutation / AI streaming POST requests
  if (request.method !== 'GET' || url.pathname.startsWith('/api/ai')) {
    return;
  }

  // Cache questions GET responses for offline access
  if (url.pathname.startsWith('/api/questions') || url.pathname.startsWith('/api/topics')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Default network-first falling back to cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Background Sync handler
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-user-progress') {
    event.waitUntil(
      // Inform clients to sync local progress to server
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'BACKGROUND_SYNC_PROGRESS' });
        });
      })
    );
  }
});

