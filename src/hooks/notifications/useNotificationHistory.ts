import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NotificationItem } from '../../types';
import { logger } from '../../utils/logger';

const NOTIFICATIONS_DB = 'NotificationHistory';
const NOTIFICATIONS_STORE = 'notifications';
const MAX_NOTIFICATIONS = 50;

const openNotificationsDb = async (): Promise<IDBDatabase> => {
  return await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(NOTIFICATIONS_DB, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(NOTIFICATIONS_STORE)) {
        const store = db.createObjectStore(NOTIFICATIONS_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

const loadLocalStorageNotifications = (): NotificationItem[] => {
  try {
    const saved = localStorage.getItem('notifications_history');
    if (!saved) return [];
    return JSON.parse(saved);
  } catch (e) {
    logger.error('Failed to load notifications from localStorage:', e);
    return [];
  }
};

const loadIndexedDbNotifications = async (): Promise<NotificationItem[]> => {
  try {
    const db = await openNotificationsDb();
    const tx = db.transaction(NOTIFICATIONS_STORE, 'readonly');
    const store = tx.objectStore(NOTIFICATIONS_STORE);
    const allNotifications = await new Promise<any[]>((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
    db.close();

    return allNotifications.map((notif) => ({
      id: notif.id?.toString() || `idb-${Date.now()}-${Math.random()}`,
      title: notif.title,
      message: notif.message,
      type: notif.type || 'info',
      date: new Date(notif.timestamp).getTime(),
      timestamp: notif.timestamp,
      read: true
    }));
  } catch (error) {
    logger.error('Failed to load notifications from IndexedDB:', error);
    return [];
  }
};

const dedupeNotifications = (items: NotificationItem[]): NotificationItem[] => {
  return items.filter((notif, index, self) =>
    index === self.findIndex((n) =>
      n.title === notif.title &&
      n.message === notif.message &&
      Math.abs(new Date(n.timestamp || n.date).getTime() - new Date(notif.timestamp || notif.date).getTime()) < 1000
    )
  );
};

const sortAndLimit = (items: NotificationItem[]): NotificationItem[] => {
  return items.sort((a, b) =>
    new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime()
  ).slice(0, MAX_NOTIFICATIONS);
};

const clearNotificationsDb = async (): Promise<void> => {
  try {
    const db = await openNotificationsDb();
    const tx = db.transaction(NOTIFICATIONS_STORE, 'readwrite');
    tx.objectStore(NOTIFICATIONS_STORE).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (error) {
    logger.error('Failed to clear notifications in IndexedDB:', error);
  }
};

export const useNotificationHistory = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const didLoad = useRef(false);

  const loadNotifications = useCallback(async () => {
    const localStorageNotifications = loadLocalStorageNotifications();
    const indexedDbNotifications = await loadIndexedDbNotifications();
    const merged = dedupeNotifications([...localStorageNotifications, ...indexedDbNotifications]);
    const sorted = sortAndLimit(merged);
    setNotifications(sorted);
    logger.debug(`Total unique notifications: ${sorted.length}`);
  }, []);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    try {
      localStorage.setItem('notifications_history', JSON.stringify(notifications));
    } catch (e) {
      logger.error('Failed to persist notifications to localStorage:', e);
    }
  }, [notifications]);

  const addNotification = useCallback((input: Omit<NotificationItem, 'id' | 'date' | 'read'>) => {
    const newItem: NotificationItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      date: input.timestamp ? new Date(input.timestamp).getTime() : Date.now(),
      read: false,
      ...input
    };
    setNotifications(prev => [newItem, ...prev].slice(0, MAX_NOTIFICATIONS));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearHistory = useCallback(async () => {
    setNotifications([]);
    try {
      localStorage.removeItem('notifications_history');
    } catch (e) {
      logger.error('Failed to clear notifications from localStorage:', e);
    }
    await clearNotificationsDb();
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  return {
    notifications,
    addNotification,
    markAllRead,
    clearHistory,
    unreadCount
  };
};
