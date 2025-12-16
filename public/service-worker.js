const CACHE_NAME = 'blackout-calendar-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Simple logger for Service Worker
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
let SW_LOG_LEVEL = LOG_LEVELS.warn; // Production: only warn and error

const swLogger = {
  debug: (msg, ...args) => {
    if (LOG_LEVELS.debug >= SW_LOG_LEVEL) {
      console.log(`[SW] ${msg}`, ...args);
    }
  },
  info: (msg, ...args) => {
    if (LOG_LEVELS.info >= SW_LOG_LEVEL) {
      console.log(`[SW] ${msg}`, ...args);
    }
  },
  warn: (msg, ...args) => {
    if (LOG_LEVELS.warn >= SW_LOG_LEVEL) {
      console.warn(`[SW] ${msg}`, ...args);
    }
  },
  error: (msg, ...args) => {
    if (LOG_LEVELS.error >= SW_LOG_LEVEL) {
      console.error(`[SW] ${msg}`, ...args);
    }
  }
};

// Allow changing log level: call setSwLogLevel('debug') in console
self.setSwLogLevel = (level) => {
  if (LOG_LEVELS[level] !== undefined) {
    SW_LOG_LEVEL = LOG_LEVELS[level];
    console.log(`[SW] Log level changed to: ${level}`);
  }
};

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
    swLogger.error('Failed to get silent mode:', e);
    return false;
  }
}

// Helper to save notification to history
async function saveNotificationToHistory(notification) {
  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('NotificationHistory', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('notifications')) {
          const store = db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    const tx = db.transaction('notifications', 'readwrite');
    const store = tx.objectStore('notifications');

    await new Promise((resolve, reject) => {
      const request = store.add(notification);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
    return true;
  } catch (e) {
    swLogger.error('Failed to save notification to IndexedDB:', e);
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
      swLogger.error('Failed to parse push data, falling back to text:', e);
      const text = event.data.text();
      if (text) {
        data.body = text;
      }
    }
  }

  event.waitUntil(
    (async () => {
      swLogger.debug('[SW] Push received:', data);

      const silentMode = await getSilentMode();

      // Зберегти повідомлення в IndexedDB для історії
      try {
        await saveNotificationToHistory({
          title: data.title,
          message: data.body,
          type: data.data?.type || 'info',
          timestamp: new Date().toISOString()
        });
        swLogger.debug('[SW] Notification saved to history');
      } catch (error) {
        swLogger.error('[SW] Failed to save notification to history:', error);
      }

      // Надсилати повідомлення до UI якщо є відкриті вкладки
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      swLogger.debug(`[SW] Found ${clients.length} open clients`);

      if (clients.length > 0) {
        clients.forEach((client) => {
          swLogger.debug(`[SW] Sending message to client: ${client.url}`);
          client.postMessage({
            type: 'PUSH_NOTIFICATION',
            notification: {
              title: data.title,
              message: data.body,
              type: data.data?.type || 'info'
            }
          });
        });
      } else {
        swLogger.debug('[SW] No open clients, notification saved to history only');
      }

      // Показати системне сповіщення ТІЛЬКИ якщо НЕ silent mode
      if (!silentMode) {
        const options = {
          body: data.body,
          icon: data.icon || '/icon-192x192.png',
          badge: '/icon-192x192.png',
          vibrate: [200, 100, 200],
          data: {
            ...data.data,
            url: '/?notifications=open' // Open notifications panel on click
          },
          requireInteraction: false,
          tag: data.tag || `notification-${Date.now()}`,
          renotify: data.renotify,
          // Better styling for Android
          timestamp: Date.now(),
          silent: false
        };

        swLogger.debug('[SW] Showing notification with tag:', data.tag);
        await self.registration.showNotification(data.title, options);
      } else {
        swLogger.debug('[SW] Silent mode enabled, skipping system notification');
      }
    })()
  );
});

// Notification click event - Handle when user clicks on notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/?notifications=open';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      if (clientList.length > 0) {
        // Focus existing window and send message to open notifications
        const client = clientList[0];
        client.focus();
        client.postMessage({
          type: 'OPEN_NOTIFICATIONS_PANEL'
        });
        return;
      }

      // Otherwise, open a new window with notifications panel open
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});