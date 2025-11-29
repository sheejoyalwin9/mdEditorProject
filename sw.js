const CACHE_NAME = 'markdown-editor-v1';
const urlsToCache = [
  '/', // The root path, usually index.html
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  // You MUST cache all locally required icon files (if you created them)
  '/images/icon-48x48.png', 
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  
  // NOTE: We generally avoid caching external CDNs in a basic example, 
  // as it can complicate updates and licensing.
  // For a production-ready PWA, you might implement a stale-while-revalidate 
  // strategy for CDNs like marked.min.js. For now, we will assume 
  // the user is online when loading external libraries.
];

// 1. Install Event: Caching the static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install event: Caching Shell');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.error('[Service Worker] Failed to cache assets:', err);
      })
  );
});

// 2. Fetch Event: Serving content from cache if available
self.addEventListener('fetch', (event) => {
  // Check if this is a request for one of our cached assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          console.log(`[Service Worker] Serving from cache: ${event.request.url}`);
          return response;
        }
        // No match in cache - fetch from network
        return fetch(event.request);
      }
    )
  );
});

// 3. Activate Event: Cleaning up old caches (updating the version)
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`[Service Worker] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});