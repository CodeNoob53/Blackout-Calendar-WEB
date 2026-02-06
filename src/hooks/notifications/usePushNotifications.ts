import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { TFunction } from 'i18next';
import {
  getVapidPublicKey,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  updateNotificationQueue
} from '../../services/api';
import { NotificationItem } from '../../types';
import { logger } from '../../utils/logger';

interface UsePushNotificationsParams {
  currentQueue?: string;
  t: TFunction;
  addNotification: (input: Omit<NotificationItem, 'id' | 'date' | 'read'>) => void;
  sendSystemNotification: (title: string, body: string) => void;
}

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const usePushNotifications = ({
  currentQueue,
  t,
  addNotification,
  sendSystemNotification
}: UsePushNotificationsParams) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);

  const checkPushSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      logger.info('Push notifications not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        setPushSubscription(subscription);
        setIsPushEnabled(true);
      }
    } catch (error) {
      logger.error('Failed to check push subscription:', error);
    }
  }, []);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    checkPushSubscription();
  }, [checkPushSubscription]);

  const subscribeToPush = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      logger.debug('Push notifications not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const publicKey = await getVapidPublicKey();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as any
      });

      const notificationTypes = ['all'];
      await subscribeToPushNotifications(subscription, currentQueue, notificationTypes);

      setPushSubscription(subscription);
      setIsPushEnabled(true);

      addNotification({
        title: t('notifications:subscriptionActivated'),
        message: t('notifications:subscriptionActivatedDesc'),
        type: 'success'
      });
    } catch (error) {
      logger.error('Failed to subscribe to push notifications:', error);
      setIsPushEnabled(false);
    }
  }, [addNotification, currentQueue, t]);

  const unsubscribeToPush = useCallback(async () => {
    if (!pushSubscription) {
      logger.warn('No push subscription to unsubscribe from');
      return;
    }

    try {
      await pushSubscription.unsubscribe();
      await unsubscribeFromPushNotifications(pushSubscription.endpoint);

      setPushSubscription(null);
      setIsPushEnabled(false);

      setTimeout(() => {
        checkPushSubscription();
      }, 500);

      addNotification({
        title: t('notifications:subscriptionDeactivated'),
        message: t('notifications:subscriptionDeactivatedDesc'),
        type: 'info'
      });
    } catch (error) {
      logger.error('Failed to unsubscribe from push notifications:', error);
      setPushSubscription(null);
      setIsPushEnabled(false);
    }
  }, [addNotification, checkPushSubscription, pushSubscription, t]);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        await subscribeToPush();
        sendSystemNotification(
          t('notifications:notificationsEnabled'),
          t('notifications:notificationsEnabledMessage')
        );
      }
    } catch (e) {
      logger.error(e);
    }
  }, [sendSystemNotification, subscribeToPush, t]);

  useEffect(() => {
    if (pushSubscription && currentQueue) {
      const timeoutId = setTimeout(async () => {
        try {
          await updateNotificationQueue(pushSubscription.endpoint, currentQueue, ['all']);
          logger.debug('Queue updated successfully');
        } catch (error: any) {
          logger.warn('Failed to update queue, subscription might be missing on backend. Attempting to re-sync...', error);

          if (axios.isAxiosError(error) && error.response?.status === 404) {
            try {
              await subscribeToPushNotifications(pushSubscription, currentQueue, ['all']);
              logger.debug('Re-subscribed to backend successfully with queue');

              addNotification({
                title: t('notifications:subscriptionRestored'),
                message: t('notifications:subscriptionRestoredDesc'),
                type: 'success'
              });
            } catch (finalError) {
              logger.error('Failed to re-subscribe to backend:', finalError);
            }
          } else {
            setTimeout(async () => {
              try {
                await updateNotificationQueue(pushSubscription.endpoint, currentQueue, ['all']);
                logger.debug('Queue updated successfully on retry');
              } catch (retryError) {
                logger.error('Failed to update queue after retry:', retryError);
              }
            }, 2000);
          }
        }
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [addNotification, currentQueue, pushSubscription, t]);

  return {
    permission,
    isPushEnabled,
    requestPermission,
    subscribeToPush,
    unsubscribeToPush
  };
};
