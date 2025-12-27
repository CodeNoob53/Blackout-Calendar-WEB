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

// Helper to get notification settings from IndexedDB
async function getNotificationSettings() {
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

    // Get all settings
    const settings = {};
    const keys = ['silentMode', 'quietHoursEnabled', 'quietHoursStart', 'quietHoursEnd', 'maxDailyNotifications', 'timezone'];

    for (const key of keys) {
      settings[key] = await new Promise((resolve) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
    }

    db.close();
    return settings;
  } catch (e) {
    swLogger.error('Failed to get notification settings:', e);
    return {};
  }
}

// Helper to check if current time is within quiet hours
function isWithinQuietHours(quietHoursStart, quietHoursEnd) {
  if (!quietHoursStart || !quietHoursEnd) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = quietHoursEnd.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// Helper to get and increment daily notification count
async function checkDailyNotificationLimit(maxDailyNotifications) {
  if (!maxDailyNotifications || maxDailyNotifications === 0) return false; // 0 = unlimited

  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('NotificationSettings', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');

    const today = new Date().toISOString().split('T')[0];
    const countKey = `dailyCount_${today}`;

    const currentCount = await new Promise((resolve) => {
      const request = store.get(countKey);
      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => resolve(0);
    });

    if (currentCount >= maxDailyNotifications) {
      db.close();
      swLogger.warn(`Daily notification limit reached: ${currentCount}/${maxDailyNotifications}`);
      return true; // Limit reached
    }

    // Increment count
    store.put(currentCount + 1, countKey);

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
    return false; // Limit not reached
  } catch (e) {
    swLogger.error('Failed to check daily notification limit:', e);
    return false; // On error, allow notification
  }
}

// Legacy function for backward compatibility
async function getSilentMode() {
  const settings = await getNotificationSettings();
  return settings.silentMode || false;
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

// Helper to save notification analytics
async function saveNotificationAnalytics(analytics) {
  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('NotificationAnalytics', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('analytics')) {
          const store = db.createObjectStore('analytics', { keyPath: 'notificationId' });
          store.createIndex('deliveredAt', 'deliveredAt', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });

    const tx = db.transaction('analytics', 'readwrite');
    const store = tx.objectStore('analytics');

    await new Promise((resolve, reject) => {
      const request = store.put(analytics); // Use put to update existing records
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
    swLogger.debug('[SW] Analytics saved:', analytics);
    return true;
  } catch (e) {
    swLogger.error('Failed to save notification analytics:', e);
    return false;
  }
}

// Vibration patterns for different notification types (2025 best practices)
const VIBRATION_PATTERNS = {
  emergency: [300, 100, 300, 100, 300], // Urgent: triple vibration
  power_off_30min: [200, 100, 200, 100, 200], // Critical: double vibration
  schedule_change: [200, 100, 200], // Important: standard vibration
  power_on: [200], // Info: single vibration
  default: [200, 100, 200] // Standard pattern
};

// Helper to build notification options based on type
function getNotificationOptions(data) {
  const notificationType = data.data?.type;
  const url = data.data?.url || '/?notifications=open';

  // Generate consistent tag for emergency notifications to prevent duplicates
  let notificationTag = data.tag || `notification-${Date.now()}`;

  if (notificationType === 'emergency' || notificationType === 'emergency_blackout') {
    // Use consistent tag for emergency notifications (group by day)
    const today = new Date().toISOString().split('T')[0];
    notificationTag = `emergency-${today}`;
  }

  // Choose vibration pattern based on type
  const vibrate = VIBRATION_PATTERNS[notificationType] || VIBRATION_PATTERNS.default;

  const baseOptions = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: vibrate,
    data: {
      ...data.data,
      url,
      notificationId: `${notificationType}-${Date.now()}`, // For analytics
      deliveredAt: Date.now()
    },
    tag: notificationTag,
    renotify: notificationType === 'emergency' || notificationType === 'emergency_blackout', // Renotify for emergencies
    silent: false,
    // Add timestamp for better notification management
    timestamp: Date.now()
  };

  // Configure based on notification type with TTL (Time-To-Live)
  if (notificationType === 'power_off_30min') {
    // CRITICAL: User needs to prepare for power outage
    // TTL: 30 minutes (after that, the alert is no longer relevant)
    return {
      ...baseOptions,
      requireInteraction: true, // Keep visible until user acts
      actions: [
        { action: 'view', title: 'Переглянути графік' },
        { action: 'dismiss', title: 'Зрозуміло' }
      ],
      // Note: TTL is set on backend push message, not in notification options
      data: { ...baseOptions.data, ttl: 1800, urgency: 'high' }
    };
  }

  if (notificationType === 'emergency' || notificationType === 'emergency_blackout') {
    // EMERGENCY: Important alert
    return {
      ...baseOptions,
      requireInteraction: true, // Keep visible until user acts
      actions: [
        { action: 'view', title: 'Детальніше' },
        { action: 'dismiss', title: 'Закрити' }
      ],
      data: { ...baseOptions.data, ttl: 3600, urgency: 'high' }
    };
  }

  if (notificationType === 'schedule_change') {
    // Informational: Can auto-dismiss
    return {
      ...baseOptions,
      requireInteraction: false,
      actions: [
        { action: 'view', title: 'Подивитись' }
      ],
      data: { ...baseOptions.data, ttl: 86400, urgency: 'normal' } // 24 hours
    };
  }

  if (notificationType === 'power_on') {
    // Helpful: Can auto-dismiss
    return {
      ...baseOptions,
      requireInteraction: false,
      actions: [
        { action: 'dismiss', title: 'OK' }
      ],
      data: { ...baseOptions.data, ttl: 300, urgency: 'low' } // 5 minutes
    };
  }

  // Default: Standard notification
  return {
    ...baseOptions,
    requireInteraction: false,
    data: { ...baseOptions.data, ttl: 3600, urgency: 'normal' }
  };
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

      // Get all notification settings
      const settings = await getNotificationSettings();
      const silentMode = settings.silentMode || false;

      // Check quiet hours
      if (settings.quietHoursEnabled && isWithinQuietHours(settings.quietHoursStart, settings.quietHoursEnd)) {
        swLogger.debug('[SW] Within quiet hours, skipping system notification');
        // Still save to history but don't show notification
        const timestamp = new Date().toISOString();
        await saveNotificationToHistory({
          title: data.title,
          message: data.body,
          type: data.data?.type || 'info',
          timestamp: timestamp
        });
        return;
      }

      // Check daily notification limit
      const limitReached = await checkDailyNotificationLimit(settings.maxDailyNotifications);
      if (limitReached) {
        swLogger.debug('[SW] Daily notification limit reached, skipping system notification');
        // Save to history but don't show notification
        const timestamp = new Date().toISOString();
        await saveNotificationToHistory({
          title: data.title,
          message: data.body,
          type: data.data?.type || 'info',
          timestamp: timestamp
        });
        return;
      }

      // Create timestamp once for consistency
      const timestamp = new Date().toISOString();

      // Зберегти повідомлення в IndexedDB для історії
      try {
        await saveNotificationToHistory({
          title: data.title,
          message: data.body,
          type: data.data?.type || 'info',
          timestamp: timestamp
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
              type: data.data?.type || 'info',
              timestamp: timestamp
            }
          });
        });
      } else {
        swLogger.debug('[SW] No open clients, notification saved to history only');
      }

      // Показати системне сповіщення ТІЛЬКИ якщо НЕ silent mode
      if (!silentMode) {
        const options = getNotificationOptions(data);

        swLogger.debug('[SW] Showing notification:', {
          type: data.data?.type,
          tag: options.tag,
          requireInteraction: options.requireInteraction,
          hasActions: options.actions?.length > 0
        });

        await self.registration.showNotification(data.title, options);

        // Save analytics for delivered notification
        await saveNotificationAnalytics({
          notificationId: options.data.notificationId,
          type: data.data?.type || 'info',
          deliveredAt: Date.now()
        });
      } else {
        swLogger.debug('[SW] Silent mode enabled, skipping system notification');
      }
    })()
  );
});

// Notification click event - Handle when user clicks on notification
self.addEventListener('notificationclick', (event) => {
  swLogger.debug('[SW] Notification clicked:', {
    action: event.action,
    type: event.notification.data?.type
  });

  // Save analytics for notification click
  event.waitUntil(
    (async () => {
      const notificationId = event.notification.data?.notificationId;
      if (notificationId) {
        try {
          const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('NotificationAnalytics', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
          });

          const tx = db.transaction('analytics', 'readwrite');
          const store = tx.objectStore('analytics');

          // Get existing analytics
          const existing = await new Promise((resolve) => {
            const request = store.get(notificationId);
            request.onsuccess = () => resolve(request.result || {});
            request.onerror = () => resolve({});
          });

          // Update with click info
          const analytics = {
            ...existing,
            notificationId: notificationId,
            type: event.notification.data?.type || 'info',
            deliveredAt: existing.deliveredAt || Date.now(),
            clickedAt: Date.now(),
            action: event.action || 'default',
            dismissedAt: event.action === 'dismiss' ? Date.now() : existing.dismissedAt
          };

          store.put(analytics);

          await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          });

          db.close();
          swLogger.debug('[SW] Click analytics saved:', analytics);
        } catch (e) {
          swLogger.error('Failed to save click analytics:', e);
        }
      }
    })()
  );

  event.notification.close();

  // Handle action buttons
  if (event.action === 'dismiss') {
    // User explicitly dismissed - do nothing
    swLogger.debug('[SW] User dismissed notification');
    return;
  }

  // 'view' action or default click
  const urlToOpen = event.notification.data?.url || '/?notifications=open';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      if (clientList.length > 0) {
        // Focus existing window
        const client = clientList[0];
        client.focus();

        // Send message to open appropriate view
        if (event.action === 'view' || !event.action) {
          client.postMessage({
            type: 'OPEN_NOTIFICATIONS_PANEL',
            notificationData: event.notification.data
          });
        }
        return;
      }

      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});