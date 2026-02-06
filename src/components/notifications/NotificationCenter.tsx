import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Bell, X, Trash2, Check, AlertTriangle, CheckCircle, Calendar, MessageSquare, ChevronLeft } from 'lucide-react';
import { NotificationSettings, NotificationItem, QueueData } from '../../types';
import axios from 'axios';
import {
  fetchNewSchedules,
  fetchChangedSchedules,
  getVapidPublicKey,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  updateNotificationQueue
} from '../../services/api';
import { timeToMinutes } from '../../utils/timeHelper';
import { logger } from '../../utils/logger';

interface NotificationCenterProps {
  currentQueueData?: QueueData;
  isToday: boolean;
  renderTrigger?: (unreadCount: number, onClick: () => void) => React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onBack?: () => void;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  lightAlerts: true,
  nightMode: true,
  scheduleUpdates: true,
  tomorrowSchedule: true,
  silentMode: false,
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  currentQueueData,
  isToday,
  renderTrigger,
  isOpen: controlledIsOpen,
  onOpenChange,
  onBack
}) => {
  const { t, i18n } = useTranslation(['notifications', 'schedule']);
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : uncontrolledIsOpen;
  
  const setIsOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setUncontrolledIsOpen(value);
    }
  };
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);

  const [settings, setSettings] = useState<NotificationSettings>(() => {
    try {
      const saved = localStorage.getItem('notification_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  const processedAlerts = useRef<Set<string>>(new Set());
  const processedUpdateIds = useRef<Set<string>>(
    (() => {
      try {
        const saved = localStorage.getItem('notification_processed_updates');
        return saved ? new Set(JSON.parse(saved)) : new Set();
      } catch (e) {
        return new Set();
      }
    })()
  );
  const serverUnavailableNotified = useRef(false);
  const processedEmergencies = useRef<Set<string>>(new Set());

  const addNotification = (input: Omit<NotificationItem, 'id' | 'date' | 'read'>) => {
    const newItem: NotificationItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      date: input.timestamp ? new Date(input.timestamp).getTime() : Date.now(),
      read: false,
      ...input
    };
    setNotifications(prev => [newItem, ...prev]);
  };

  const notifyServerUnavailable = () => {
    if (serverUnavailableNotified.current) return;

    addNotification({
      title: t('notifications:serverUnavailable'),
      message: t('notifications:serverUnavailableMessage'),
      type: 'warning'
    });

    serverUnavailableNotified.current = true;
  };

  const resetServerUnavailable = () => {
    serverUnavailableNotified.current = false;
  };

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    checkPushSubscription();
    loadNotificationsFromIndexedDB();

    // Слухати повідомлення від Service Worker
    if ('serviceWorker' in navigator) {
      const messageHandler = (event: MessageEvent) => {
        logger.debug('[NotificationCenter] Received message from SW:', event.data);

        if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
          const { notification } = event.data;
          logger.debug('[NotificationCenter] Processing PUSH_NOTIFICATION:', notification);

          // Для аварійних ситуацій показуємо системний alert або модальне вікно (тут поки alert для надійності)
          // Backend sends 'emergency_blackout' for sendEmergencyNotification
          const isEmergency = notification.type === 'emergency' || notification.type === 'emergency_blackout';

          // Дедуплікація аварійних сповіщень (по дню + title)
          if (isEmergency) {
            const today = new Date().toISOString().split('T')[0];
            const emergencyKey = `${today}-${notification.title}`;

            if (processedEmergencies.current.has(emergencyKey)) {
              logger.debug('[NotificationCenter] Emergency notification already processed today, skipping duplicate');
              return;
            }

            processedEmergencies.current.add(emergencyKey);

            // Можна замінити на гарне модальне вікно в майбутньому
            const alertTitle = i18n.language === 'en' ? 'EMERGENCY' : 'АВАРІЙНЕ ВІДКЛЮЧЕННЯ';
            alert(`🚨 ${alertTitle}\n\n${notification.title}\n${notification.message}`);
          }

          addNotification({
            title: notification.title,
            message: notification.message,
            type: isEmergency ? 'warning' : (notification.type as 'info' | 'warning' | 'success'),
            timestamp: notification.timestamp
          });

          logger.debug('[NotificationCenter] Notification added to list');
        }

        // Open notifications panel when user clicks system notification
        if (event.data && event.data.type === 'OPEN_NOTIFICATIONS_PANEL') {
          logger.debug('[NotificationCenter] Opening notifications panel');
          setIsOpen(true);
          setActiveTab('notifications');
        }
      };

      navigator.serviceWorker.addEventListener('message', messageHandler);

      return () => {
        navigator.serviceWorker.removeEventListener('message', messageHandler);
      };
    }

    // Check URL parameter to auto-open notifications
    const params = new URLSearchParams(window.location.search);
    if (params.get('notifications') === 'open') {
      setTimeout(() => {
        setIsOpen(true);
        setActiveTab('notifications');
      }, 500);
    }
  }, []);

  const loadNotificationsFromIndexedDB = async () => {
    try {
      // Load from localStorage first
      let localStorageNotifications: NotificationItem[] = [];
      try {
        const saved = localStorage.getItem('notifications_history');
        if (saved) {
          localStorageNotifications = JSON.parse(saved);
          logger.debug(`Loaded ${localStorageNotifications.length} notifications from localStorage`);
        }
      } catch (e) {
        logger.error('Failed to load from localStorage:', e);
      }

      // Load from IndexedDB
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('NotificationHistory', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('notifications')) {
            const store = db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
      });

      const tx = db.transaction('notifications', 'readonly');
      const store = tx.objectStore('notifications');
      const allNotifications = await new Promise<any[]>((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });

      db.close();

      // Convert IndexedDB format to NotificationItem format
      const convertedNotifications: NotificationItem[] = allNotifications.map((notif) => ({
        id: notif.id?.toString() || `idb-${Date.now()}-${Math.random()}`,
        title: notif.title,
        message: notif.message,
        type: notif.type || 'info',
        date: new Date(notif.timestamp).getTime(),
        timestamp: notif.timestamp,
        read: true // Mark as read since they're from history
      }));

      logger.debug(`Loaded ${convertedNotifications.length} notifications from IndexedDB`);

      // Merge localStorage + IndexedDB
      const merged = [...localStorageNotifications, ...convertedNotifications];

      // Remove duplicates based on title, message, and timestamp
      const unique = merged.filter((notif, index, self) =>
        index === self.findIndex((n) =>
          n.title === notif.title &&
          n.message === notif.message &&
          Math.abs(new Date(n.timestamp || n.date).getTime() - new Date(notif.timestamp || notif.date).getTime()) < 1000
        )
      );

      // Sort by date (newest first) and keep only last 50
      const sorted = unique.sort((a, b) =>
        new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime()
      ).slice(0, 50);

      setNotifications(sorted);
      logger.debug(`Total unique notifications: ${sorted.length}`);
    } catch (error) {
      logger.error('Failed to load notifications from IndexedDB:', error);

      // Fallback to localStorage only if IndexedDB fails
      try {
        const saved = localStorage.getItem('notifications_history');
        if (saved) {
          setNotifications(JSON.parse(saved));
        }
      } catch (e) {
        logger.error('Failed to load from localStorage fallback:', e);
      }
    }
  };

  const checkPushSubscription = async () => {
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
        // Verification will be done in useEffect when currentQueueData is available
      }
    } catch (error) {
      logger.error('Failed to check push subscription:', error);
    }
  };

  const toggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 12,
        right: window.innerWidth - rect.right
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    localStorage.setItem('notification_settings', JSON.stringify(settings));

    // Зберегти silentMode в IndexedDB для Service Worker
    const saveSilentMode = async () => {
      try {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
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

        const tx = db.transaction('settings', 'readwrite');
        const store = tx.objectStore('settings');
        store.put(settings.silentMode, 'silentMode');

        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });

        db.close();
      } catch (error) {
        logger.error('Failed to save silent mode to IndexedDB:', error);
      }
    };

    saveSilentMode();
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('notifications_history', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      
      // Mark as read when closing
      const hasUnread = notifications.some(n => !n.read);
      if (hasUnread) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  const requestPermission = async () => {

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
  };

  const subscribeToPush = async () => {
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

      // Subscribe with queue if already selected
      const notificationTypes = ['all'];
      await subscribeToPushNotifications(
        subscription,
        currentQueueData?.queue,
        notificationTypes
      );

      setPushSubscription(subscription);
      setIsPushEnabled(true);

      logger.debug('Successfully subscribed to push notifications');

      addNotification({
        title: t('notifications:subscriptionActivated'),
        message: t('notifications:subscriptionActivatedDesc'),
        type: 'success'
      });
    } catch (error) {
      logger.error('Failed to subscribe to push notifications:', error);
      setIsPushEnabled(false);
    }
  };

  const unsubscribeToPush = async () => {
    if (!pushSubscription) {
      logger.warn('No push subscription to unsubscribe from');
      return;
    }

    try {
      // 1. Unsubscribe from browser's PushManager
      await pushSubscription.unsubscribe();
      logger.debug('Unsubscribed from browser PushManager');

      // 2. Remove subscription from backend
      await unsubscribeFromPushNotifications(pushSubscription.endpoint);
      logger.debug('Removed subscription from backend');

      // 3. Update local state
      setPushSubscription(null);
      setIsPushEnabled(false);

      // 4. Force re-check to ensure UI is in sync
      setTimeout(() => {
        checkPushSubscription();
      }, 500);

      logger.debug('Successfully unsubscribed from push notifications');

      addNotification({
        title: t('notifications:subscriptionDeactivated'),
        message: t('notifications:subscriptionDeactivatedDesc'),
        type: 'info'
      });
    } catch (error) {
      logger.error('Failed to unsubscribe from push notifications:', error);

      // Even if backend call fails, still update local state
      setPushSubscription(null);
      setIsPushEnabled(false);
    }
  };

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

  const sendSystemNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
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
            icon: 'https://img.icons8.com/?size=192&id=TMhsmDzqlwEO&format=png&color=000000',
          });
        }
      } catch (e) {
        logger.error("Notification error", e);
      }
    }
  };

  useEffect(() => {
    if (!settings.lightAlerts || !currentQueueData || !isToday) return;

    const checkInterval = setInterval(() => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTotalMinutes = currentHours * 60 + currentMinutes;

      if (settings.nightMode) {
        if (currentHours >= 22 || currentHours < 8) return;
      }

      currentQueueData.intervals.forEach(interval => {
        const startMin = timeToMinutes(interval.start);
        const endMin = timeToMinutes(interval.end);

        const timeUntilOff = startMin - currentTotalMinutes;
        const offAlertId = `${new Date().toDateString()}-${interval.start}-off`;

        if (timeUntilOff === 30 && !processedAlerts.current.has(offAlertId)) {
          const title = t('schedule:lightOff');
          const msg = t('schedule:lightOffDesc', { time: interval.start });

          addNotification({
            title: title,
            message: msg,
            type: 'warning'
          });
          sendSystemNotification(title, msg);
          processedAlerts.current.add(offAlertId);
        }

        const timeUntilOn = endMin - currentTotalMinutes;
        const onAlertId = `${new Date().toDateString()}-${interval.end}-on`;

        if (timeUntilOn === 30 && !processedAlerts.current.has(onAlertId)) {
          const title = t('schedule:lightOn');
          const msg = t('schedule:lightOnDesc', { time: interval.end });

          addNotification({
            title: title,
            message: msg,
            type: 'success'
          });
          sendSystemNotification(title, msg);
          processedAlerts.current.add(onAlertId);
        }
      });
    }, 60000);

    return () => clearInterval(checkInterval);
  }, [settings.lightAlerts, settings.nightMode, currentQueueData, isToday]);

  // Verify and restore subscription when currentQueueData becomes available
  useEffect(() => {
    if (pushSubscription && currentQueueData && isPushEnabled) {
      const verifySubscription = async () => {
        try {
          await updateNotificationQueue(pushSubscription.endpoint, currentQueueData.queue, ['all']);
          logger.debug('Subscription verified on backend');
        } catch (error: any) {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            logger.warn('Subscription lost on backend (DB reset?), auto-restoring...');
            try {
              await subscribeToPushNotifications(pushSubscription, currentQueueData.queue, ['all']);
              logger.debug('✅ Subscription auto-restored successfully!');

              addNotification({
                title: t('notifications:subscriptionRestored'),
                message: t('notifications:subscriptionRestoredDesc'),
                type: 'success'
              });
            } catch (restoreError) {
              logger.error('Failed to auto-restore subscription:', restoreError);
            }
          }
        }
      };

      // Run verification after a short delay
      const timeoutId = setTimeout(verifySubscription, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [currentQueueData, pushSubscription, isPushEnabled, i18n.language]);

  useEffect(() => {
    if (pushSubscription && currentQueueData) {
      // Add delay to ensure subscription is saved in DB first
      // Increased to 2000ms to account for network latency to Render backend
      const timeoutId = setTimeout(async () => {
        try {
          await updateNotificationQueue(
            pushSubscription.endpoint,
            currentQueueData.queue,
            ['all']
          );
          logger.debug('Queue updated successfully');
        } catch (error: any) {
          logger.warn('Failed to update queue, subscription might be missing on backend. Attempting to re-sync...', error);

          // If 404 - subscription not found, re-register it on backend
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            try {
              // Re-subscribe to backend with queue in single atomic call
              await subscribeToPushNotifications(pushSubscription, currentQueueData.queue, ['all']);
              logger.debug('Re-subscribed to backend successfully with queue');
            } catch (finalError) {
              logger.error('Failed to re-subscribe to backend:', finalError);
            }
          } else {
            // For other errors, just retry once after 2s
            setTimeout(async () => {
              try {
                await updateNotificationQueue(
                  pushSubscription.endpoint,
                  currentQueueData.queue,
                  ['all']
                );
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
  }, [currentQueueData, pushSubscription, i18n.language]);

  useEffect(() => {
    let isMounted = true;

    const checkForUpdates = async () => {
      // Helper to process a batch of items (new or changed)
      const processBatch = (
        items: any[],
        type: 'info' | 'warning',
        idPrefix: string,
        getTitle: (item: any) => string,
        getMsg: (item: any) => string
      ) => {
        // 1. Identify all unprocessed items
        const unprocessedItems = items.filter(item => {
          const id = item.updatedAt
            ? `${idPrefix}-${item.date}-${item.updatedAt}`
            : `${idPrefix}-${item.date}-${item.sourcePostId}`;
          return !processedUpdateIds.current.has(id);
        });

        if (unprocessedItems.length === 0) return;

        // 2. Group by date
        const byDate: Record<string, any[]> = {};
        unprocessedItems.forEach(item => {
          if (!byDate[item.date]) byDate[item.date] = [];
          byDate[item.date].push(item);
        });

        // 3. For each date, find the LATEST item to notify about
        // But mark ALL as processed so they don't show up later
        Object.entries(byDate).forEach(([date, dateItems]) => {
          // Sort by time (updatedAt or messageDate or just trust the order? Backend usually sorts DESC, but let's be safe)
          dateItems.sort((a, b) => {
            const tA = new Date(a.updatedAt || a.messageDate || 0).getTime();
            const tB = new Date(b.updatedAt || b.messageDate || 0).getTime();
            return tB - tA;
          });

          const latestItem = dateItems[0]; // The winner

          // Notify ONLY for the latest item
          const title = getTitle(latestItem);
          const msg = getMsg(latestItem);

          addNotification({
            title: title,
            message: msg,
            type: type
          });
          sendSystemNotification(title, msg);

          // Mark ALL items for this date as processed
          dateItems.forEach(item => {
            const id = item.updatedAt
              ? `${idPrefix}-${item.date}-${item.updatedAt}`
              : `${idPrefix}-${item.date}-${item.sourcePostId}`;
            processedUpdateIds.current.add(id);
          });
        });

        // Update storage once after processing all dates
        localStorage.setItem('notification_processed_updates', JSON.stringify(Array.from(processedUpdateIds.current)));
      };


      if (settings.tomorrowSchedule) {
        try {
          const data = await fetchNewSchedules(24);
          if (!isMounted) return;
          if (data.serviceUnavailable) {
            notifyServerUnavailable();
          } else {
            resetServerUnavailable();
            if (data.success && data.count > 0) {
              processBatch(
                data.schedules,
                'info',
                'new',
                (item) => t('schedule:newSchedule'),
                (item) => item.pushMessage || t('schedule:scheduleFor', { date: item.date })
              );
            }
          }
        } catch (e) {
          logger.error("Failed to check new schedules", e);
        }
      }

      if (settings.scheduleUpdates) {
        try {
          const data = await fetchChangedSchedules(24);
          if (!isMounted) return;
          if (data.serviceUnavailable) {
            notifyServerUnavailable();
          } else {
            resetServerUnavailable();
            if (data.success && data.count > 0) {
              processBatch(
                data.schedules,
                'warning',
                'change',
                (item) => t('schedule:scheduleChanged'),
                (item) => item.pushMessage || t('schedule:changesFor', { date: item.date })
              );
            }
          }
        } catch (e) {
          logger.error("Failed to check changed schedules", e);
        }
      }
    };

    checkForUpdates();
    const pollInterval = setInterval(checkForUpdates, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [settings.tomorrowSchedule, settings.scheduleUpdates]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearHistory = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {renderTrigger ? (
        renderTrigger(unreadCount, toggleOpen)
      ) : (
        <button
          ref={buttonRef}
          onClick={toggleOpen}
          className="icon-btn"
        >
          <Bell size={20} fill="currentColor" />
          {unreadCount > 0 && (
            <span className="badge-dot">
              <span className="badge-ping"></span>
              <span className="badge-solid"></span>
            </span>
          )}
        </button>
      )}

      {isOpen && createPortal(
        <>
          <div className="modal-backdrop" onClick={() => setIsOpen(false)} />

          <div className="modal-content" style={{
            '--modal-top': `${position.top}px`,
            '--modal-right': `${position.right}px`
          } as React.CSSProperties}>

            <div className="modal-header">
              {onBack && (
                <button onClick={onBack} className="back-btn" aria-label="Go back">
                  <ChevronLeft size={24} />
                </button>
              )}
              <button
                onClick={() => setActiveTab('notifications')}
                className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
              >
                {t('notifications:title')} {unreadCount > 0 && `(${unreadCount})`}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              >
                {t('notifications:settings')}
              </button>
              <button onClick={() => setIsOpen(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {activeTab === 'notifications' ? (
                <div>
                  <div className="nc-actions-header">
                    <button onClick={markAllRead} className="nc-action-btn">
                      <Check size={12} /> {t('notifications:markAllRead')}
                    </button>
                    <button onClick={clearHistory} className="nc-action-btn">
                      <Trash2 size={12} /> {t('notifications:clear')}
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="nc-empty-state">
                      <Bell size={40} className="nc-empty-icon" />
                      <p className="nc-empty-text">{t('notifications:empty')}</p>
                    </div>
                  ) : (
                    <div>
                      {notifications.map((n) => (
                        <div key={n.id} className={`notification-item ${n.type === 'warning' ? 'notif-warning' : n.type === 'info' ? 'notif-info' : 'notif-success'}`}>
                          <div className="nc-item-header">
                            <div className="nc-icon-wrapper">
                              {n.type === 'info' ? <Calendar size={40} /> :
                                n.type === 'warning' ? <AlertTriangle size={40} /> :
                                  <CheckCircle size={40} />}
                            </div>

                            <div className="nc-content">
                              <h4 className="nc-title">{n.title}</h4>
                              <p className="nc-message">{n.message}</p>
                              <span className="nc-timestamp">
                                {new Date(n.timestamp || n.date).toLocaleTimeString(i18n.language === 'en' ? 'en-US' : 'uk-UA', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {!n.read && (
                              <div className="nc-unread-dot" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {permission === 'default' && (
                    <div className="nc-permission-block">
                      <h4 className="nc-permission-header">
                        <MessageSquare size={16} />
                        {t('notifications:systemNotifications')}
                      </h4>
                      <p className="nc-permission-text">
                        {t('notifications:permissionText')}
                      </p>
                      <button
                        onClick={requestPermission}
                        className="nc-permission-btn"
                      >
                        {t('notifications:enable')}
                      </button>
                    </div>
                  )}

                  {permission === 'denied' && (
                    <div className="nc-permission-block denied">
                      <p className="nc-denied-text">
                        {t('notifications:notificationsBlocked')}
                      </p>
                    </div>
                  )}

                  {permission === 'granted' && (
                    <div className={`nc-push-block ${isPushEnabled ? 'enabled' : 'disabled'}`}>
                      <div className="nc-push-row">
                        <div>
                          <h4 className="nc-permission-header">
                            <CheckCircle size={16} />
                            {isPushEnabled ? t('notifications:webPushEnabled') : t('notifications:webPushDisabled')}
                          </h4>
                          <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                            {isPushEnabled ? t('notifications:webPushDescription') : t('notifications:webPushDescriptionDisabled')}
                          </p>
                        </div>
                        <button
                          onClick={isPushEnabled ? unsubscribeToPush : subscribeToPush}
                          className={`nc-push-toggle-btn ${isPushEnabled ? 'disable' : 'enable'}`}
                        >
                          {isPushEnabled ? t('notifications:disable') : t('notifications:enable')}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="nc-settings-container">

                    {[
                      {
                        id: 'silentMode',
                        label: t('notifications:silentMode'),
                        sub: t('notifications:silentModeDesc'),
                        val: settings.silentMode
                      },
                      {
                        id: 'lightAlerts',
                        label: t('notifications:lightAlerts'),
                        sub: t('notifications:lightAlertsDesc'),
                        val: settings.lightAlerts
                      },
                      {
                        id: 'nightMode',
                        label: t('notifications:nightMode'),
                        sub: t('notifications:nightModeDesc'),
                        val: settings.nightMode
                      },
                      {
                        id: 'scheduleUpdates',
                        label: t('notifications:scheduleUpdates'),
                        sub: t('notifications:scheduleUpdatesDesc'),
                        val: settings.scheduleUpdates
                      },
                      {
                        id: 'tomorrowSchedule',
                        label: t('notifications:tomorrowSchedule'),
                        sub: t('notifications:tomorrowScheduleDesc'),
                        val: settings.tomorrowSchedule
                      }
                    ].map((item) => (
                      <div key={item.id} className="setting-row">
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '2px' }}>{item.label}</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.sub}</p>
                        </div>
                        <button
                          onClick={() => setSettings(s => ({ ...s, [item.id]: !item.val }))}
                          className={`toggle-switch ${item.val ? 'on' : ''}`}
                        >
                          <div className="toggle-thumb" />
                        </button>
                      </div>
                    ))}

                  </div>
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default NotificationCenter;