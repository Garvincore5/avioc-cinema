// Avioc Apps - PWA Service Worker | Avioc App Store + Cinema Player
const CACHE_NAME = 'avioc-apps-v20';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/cinema.html',
  '/manifest.json',
  '/favicon.svg?v=2',
  '/icon-192.png?v=2',
  '/icon-512.png?v=2',
  '/assets/hls.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache non-critical warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  // Never cache large streaming media, video fragments, or live feeds
  if (
    url.pathname.endsWith('.m3u8') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.mp4') ||
    url.pathname.endsWith('.webm') ||
    url.pathname.includes('/api/') ||
    url.pathname.startsWith('/admin') ||
    url.hostname.includes('b-cdn.net') ||
    url.hostname.includes('live')
  ) {
    return;
  }

  // Network-first for dynamic and HTML content; cache fallback for core shell
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html') || caches.match('/');
          }
        });
      })
  );
});

// Push and Notification Handling (for updates when outside the app)
self.addEventListener('push', (event) => {
  let data = { title: 'Avioc Cinema', body: 'New update available on Avioc Cinema!' };
  try {
    if (event.data) {
      data = Object.assign(data, event.data.json());
    }
  } catch {
    if (event.data) data.body = event.data.text();
  }
  const options = {
    body: data.body || data.message || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.id || 'avioc-notif',
    renotify: true,
    data: data
  };
  event.waitUntil(self.registration.showNotification(data.title || 'Avioc Cinema', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && client.url.includes(self.location.origin) && 'focus' in client) {
          if (notifData.movieId && 'postMessage' in client) {
            client.postMessage({ type: 'avioc:play_movie', movieId: notifData.movieId });
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
