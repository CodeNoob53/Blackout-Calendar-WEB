const CACHE_NAME = 'blackout-calendar-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network First strategy for API, Cache First for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // For API requests, use Network First (try network, fallback to offline handling in app)
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // The app handles its own offline state for API via localStorage,
        // so we just return a 404 or let the app fail gracefully.
        return new Response(JSON.stringify({ error: 'Offline' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // For other requests (HTML, JS, CSS, Images), try Cache, then Network
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        // Don't cache external resources excessively or API calls here
        return fetchResponse;
      });
    })
  );
});

// Push event - Handle incoming push notifications
self.addEventListener('push', (event) => {
  let data = {
    title: 'Blackout Calendar',
    body: 'Нове повідомлення',
    icon: '/icon-192x192.png',
    data: {}
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error('Failed to parse push data:', e);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || 'https://img.icons8.com/?size=192&id=TMhsmDzqlwEO&format=png&color=000000',
    badge: 'https://img.icons8.com/?size=96&id=TMhsmDzqlwEO&format=png&color=000000',
    vibrate: [200, 100, 200],
    data: data.data,
    requireInteraction: false,
    tag: data.data?.type || 'default'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event - Handle when user clicks on notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === self.registration.scope + urlToOpen.substring(1) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});