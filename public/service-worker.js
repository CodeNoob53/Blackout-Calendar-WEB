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

// Helper to get silent mode from IndexedDB
async function getSilentMode() {
  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('NotificationSettings', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      };
    });

    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const silentMode = await new Promise((resolve) => {
      const request = store.get('silentMode');
      request.onsuccess = () => resolve(request.result || false);
      request.onerror = () => resolve(false);
    });

    db.close();
    return silentMode;
  } catch (e) {
    console.error('Failed to get silent mode:', e);
    return false;
  }
}

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
      console.error('Failed to parse push data, falling back to text:', e);
      const text = event.data.text();
      if (text) {
        data.body = text;
      }
    }
  }

  event.waitUntil(
    (async () => {
      console.log('[SW] Push received:', data);

      const silentMode = await getSilentMode();

      // Завжди надсилати повідомлення до UI
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach((client) => {
        client.postMessage({
          type: 'PUSH_NOTIFICATION',
          notification: {
            title: data.title,
            message: data.body,
            type: data.data?.type || 'info'
          }
        });
      });

      // Показати системне сповіщення ТІЛЬКИ якщо НЕ silent mode
      if (!silentMode) {
        const options = {
          body: data.body,
          icon: data.icon || 'https://img.icons8.com/?size=192&id=TMhsmDzqlwEO&format=png&color=000000',
          badge: 'https://img.icons8.com/?size=96&id=TMhsmDzqlwEO&format=png&color=000000',
          vibrate: [200, 100, 200],
          data: data.data,
          requireInteraction: false,
          tag: data.tag || 'notification-default', // Fallback to avoid error with renotify: true
          renotify: data.renotify
        };

        console.log('[SW] Showing notification with tag:', data.tag);
        await self.registration.showNotification(data.title, options);
      } else {
        console.log('[SW] Silent mode enabled, skipping system notification');
      }
    })()
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