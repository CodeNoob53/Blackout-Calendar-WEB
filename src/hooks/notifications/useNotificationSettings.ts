import { useEffect, useState } from 'react';
import { NotificationSettings } from '../../types';
import { logger } from '../../utils/logger';

const DEFAULT_SETTINGS: NotificationSettings = {
  lightAlerts: true,
  nightMode: true,
  scheduleUpdates: true,
  tomorrowSchedule: true,
  silentMode: false
};

const openSettingsDb = async (): Promise<IDBDatabase> => {
  return await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('NotificationSettings', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
    };
  });
};

const saveSilentMode = async (silentMode: boolean) => {
  try {
    const db = await openSettingsDb();
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    store.put(silentMode, 'silentMode');
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (error) {
    logger.error('Failed to save silent mode to IndexedDB:', error);
  }
};

export const useNotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    try {
      const saved = localStorage.getItem('notification_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('notification_settings', JSON.stringify(settings));
    } catch (e) {
      logger.error('Failed to persist notification settings:', e);
    }
    saveSilentMode(settings.silentMode);
  }, [settings]);

  return { settings, setSettings };
};
