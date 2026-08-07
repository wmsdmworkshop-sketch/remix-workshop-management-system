/**
 * AiVaahan DWIP Enterprise PWA Service Worker
 * Version: 1.0.0-RC1
 * 
 * STRICT CACHING POLICY:
 * Cache ONLY static app shell assets (HTML, CSS, JS, Fonts, Icons).
 * NEVER cache sensitive data: Auth, JWT tokens, Job Cards, Vehicle data,
 * Customer records, Executive Dashboards, or OEM API responses.
 */

const CACHE_NAME = 'aivaahan-dwip-shell-v1';

// Static Shell Assets to Cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
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
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // SECURITY GUARD: Never cache any API requests, auth tokens, sockets, or sensitive data
  if (
    requestUrl.pathname.startsWith('/api/') ||
    requestUrl.pathname.startsWith('/auth/') ||
    requestUrl.pathname.startsWith('/ws/') ||
    requestUrl.hostname.includes('aivaahan.com') ||
    requestUrl.hostname.includes('tatamotors.com') ||
    event.request.method !== 'GET'
  ) {
    // Network-only execution for dynamic data & APIs
    event.respondWith(fetch(event.request));
    return;
  }

  // Stale-While-Revalidate for Static Shell Assets (JS, CSS, HTML, Fonts, Images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          (requestUrl.pathname.endsWith('.js') ||
           requestUrl.pathname.endsWith('.css') ||
           requestUrl.pathname.endsWith('.png') ||
           requestUrl.pathname.endsWith('.svg') ||
           requestUrl.pathname.endsWith('.woff2'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for offline static navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });

      return cachedResponse || fetchPromise;
    })
  );
});
