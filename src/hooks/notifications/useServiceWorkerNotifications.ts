import { useEffect, useRef } from 'react';
import { logger } from '../../utils/logger';

interface PushPayload {
  title: string;
  message: string;
  type?: string;
  timestamp?: string;
}

interface UseServiceWorkerNotificationsParams {
  i18nLanguage: string;
  onPushNotification: (payload: PushPayload & { isEmergency: boolean }) => void;
  onOpenPanel: () => void;
}

export const useServiceWorkerNotifications = ({
  i18nLanguage,
  onPushNotification,
  onOpenPanel
}: UseServiceWorkerNotificationsParams) => {
  const processedEmergencies = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const messageHandler = (event: MessageEvent) => {
      logger.debug('[NotificationCenter] Received message from SW:', event.data);

      if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
        const { notification } = event.data;
        logger.debug('[NotificationCenter] Processing PUSH_NOTIFICATION:', notification);

        const isEmergency = notification.type === 'emergency' || notification.type === 'emergency_blackout';

        if (isEmergency) {
          const today = new Date().toISOString().split('T')[0];
          const emergencyKey = `${today}-${notification.title}`;

          if (processedEmergencies.current.has(emergencyKey)) {
            logger.debug('[NotificationCenter] Emergency notification already processed today, skipping duplicate');
            return;
          }

          processedEmergencies.current.add(emergencyKey);

          const alertTitle = i18nLanguage === 'en' ? 'EMERGENCY' : 'АВАРІЙНЕ ВІДКЛЮЧЕННЯ';
          alert(`🚨 ${alertTitle}\n\n${notification.title}\n${notification.message}`);
        }

        onPushNotification({
          title: notification.title,
          message: notification.message,
          type: notification.type,
          timestamp: notification.timestamp,
          isEmergency
        });

        logger.debug('[NotificationCenter] Notification added to list');
      }

      if (event.data && event.data.type === 'OPEN_NOTIFICATIONS_PANEL') {
        logger.debug('[NotificationCenter] Opening notifications panel');
        onOpenPanel();
      }
    };

    navigator.serviceWorker.addEventListener('message', messageHandler);

    return () => {
      navigator.serviceWorker.removeEventListener('message', messageHandler);
    };
  }, [i18nLanguage, onOpenPanel, onPushNotification]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('notifications') === 'open') {
      setTimeout(() => {
        onOpenPanel();
      }, 500);
    }
  }, [onOpenPanel]);
};
