import { useCallback } from 'react';
import { logger } from '../../utils/logger';

export const useSystemNotification = () => {
  return useCallback((title: string, body: string) => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        new Notification(title, {
          body,
          icon: 'https://img.icons8.com/?size=192&id=TMhsmDzqlwEO&format=png&color=000000',
          vibrate: [200, 100, 200]
        } as any);
      } else {
        new Notification(title, {
          body,
          icon: 'https://img.icons8.com/?size=192&id=TMhsmDzqlwEO&format=png&color=000000'
        });
      }
    } catch (e) {
      logger.error('Notification error', e);
    }
  }, []);
};
