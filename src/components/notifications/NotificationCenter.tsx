import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Trash2, Check, AlertTriangle, CheckCircle, Calendar, MessageSquare } from 'lucide-react';
import { NotificationSettings, NotificationItem, QueueData } from '../../types';
import {
  fetchNewSchedules,
  fetchChangedSchedules,
  getVapidPublicKey,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  updateNotificationQueue
} from '../../services/api';
import { timeToMinutes } from '../../utils/timeHelper';

interface NotificationCenterProps {
  currentQueueData?: QueueData;
  isToday: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  lightAlerts: true,
  nightMode: true,
  scheduleUpdates: true,
  tomorrowSchedule: true,
  silentMode: false,
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({ currentQueueData, isToday }) => {
  const [isOpen, setIsOpen] = useState(false);
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

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem('notifications_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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

  const addNotification = (input: Omit<NotificationItem, 'id' | 'date' | 'read'>) => {
    const newItem: NotificationItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      date: Date.now(),
      read: false,
      ...input
    };
    setNotifications(prev => [newItem, ...prev]);
  };

  const notifyServerUnavailable = () => {
    if (serverUnavailableNotified.current) return;

    addNotification({
      title: 'Сервер недоступний',
      message: 'Оновлення будуть доступні, щойно сервер відновить роботу.',
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

    // Слухати повідомлення від Service Worker
    if ('serviceWorker' in navigator) {
      const messageHandler = (event: MessageEvent) => {
        if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
          const { notification } = event.data;

          // Для аварійних ситуацій показуємо системний alert або модальне вікно (тут поки alert для надійності)
          // Backend sends 'emergency_blackout' for sendEmergencyNotification
          const isEmergency = notification.type === 'emergency' || notification.type === 'emergency_blackout';

          if (isEmergency) {
            // Можна замінити на гарне модальне вікно в майбутньому
            alert(`🚨 ${notification.title}\n\n${notification.message}`);
          }

          addNotification({
            title: notification.title,
            message: notification.message,
            type: isEmergency ? 'warning' : (notification.type as 'info' | 'warning' | 'success')
          });
        }
      };

      navigator.serviceWorker.addEventListener('message', messageHandler);

      return () => {
        navigator.serviceWorker.removeEventListener('message', messageHandler);
      };
    }
  }, []);

  const checkPushSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
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
      console.error('Failed to check push subscription:', error);
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
        console.error('Failed to save silent mode to IndexedDB:', error);
      }
    };

    saveSilentMode();
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('notifications_history', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (!isOpen) {
      const hasUnread = notifications.some(n => !n.read);
      if (hasUnread) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    }
  }, [isOpen]);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        await subscribeToPush();
        sendSystemNotification('Сповіщення увімкнено!', 'Тепер ви будете отримувати важливі нагадування.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      const publicKey = await getVapidPublicKey();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as any
      });

      await subscribeToPushNotifications(subscription);

      setPushSubscription(subscription);
      setIsPushEnabled(true);

      // Update queue if user has already selected one
      const notificationTypes = ['all'];
      if (subscription.endpoint && currentQueueData) {
        try {
          await updateNotificationQueue(subscription.endpoint, currentQueueData.queue, notificationTypes);
        } catch (error) {
          console.error('Failed to update queue initially, will retry on queue change:', error);
        }
      }

      console.log('Successfully subscribed to push notifications');
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      setIsPushEnabled(false);
    }
  };

  const unsubscribeToPush = async () => {
    if (!pushSubscription) return;

    try {
      await pushSubscription.unsubscribe();
      await unsubscribeFromPushNotifications(pushSubscription.endpoint);

      setPushSubscription(null);
      setIsPushEnabled(false);

      console.log('Successfully unsubscribed from push notifications');
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
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
        console.error("Notification error", e);
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
          const title = 'Світло зникне скоро';
          const msg = `Увага! Відключення заплановано на ${interval.start}.`;

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
          const title = 'Світло зʼявиться скоро';
          const msg = `За графіком включення очікується о ${interval.end}.`;

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

  useEffect(() => {
    if (pushSubscription && currentQueueData) {
      // Add small delay to ensure subscription is saved in DB first
      const timeoutId = setTimeout(async () => {
        try {
          await updateNotificationQueue(
            pushSubscription.endpoint,
            currentQueueData.queue,
            ['all']
          );
        } catch (error: any) {
          console.warn('Failed to update queue initially, attempting to resync subscription...', error);

          // Fallback: If 404 (subscription missing on backend), try to re-subscribe
          try {
            // Re-run the subscription flow to register on backend
            await subscribeToPush();
            // Try updating queue again
            await updateNotificationQueue(
              pushSubscription.endpoint,
              currentQueueData.queue,
              ['all']
            );
          } catch (retryError) {
            console.error('Failed to recover subscription/queue update:', retryError);
          }
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [currentQueueData, pushSubscription]);

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
                (item) => 'Новий графік',
                (item) => item.pushMessage || `Доступний графік на ${item.date}`
              );
            }
          }
        } catch (e) {
          console.error("Failed to check new schedules", e);
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
                (item) => 'Зміни в графіку',
                (item) => item.pushMessage || `Внесено зміни в графік на ${item.date}`
              );
            }
          }
        } catch (e) {
          console.error("Failed to check changed schedules", e);
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

      {isOpen && createPortal(
        <>
          <div className="modal-backdrop" onClick={() => setIsOpen(false)} />

          <div className="modal-content" style={{
            '--modal-top': `${position.top}px`,
            '--modal-right': `${position.right}px`
          } as React.CSSProperties}>

            <div className="modal-header">
              <button
                onClick={() => setActiveTab('notifications')}
                className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
              >
                Сповіщення {unreadCount > 0 && `(${unreadCount})`}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              >
                Налаштування
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
                      <Check size={12} /> Позначити прочитаним
                    </button>
                    <button onClick={clearHistory} className="nc-action-btn">
                      <Trash2 size={12} /> Очистити
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="nc-empty-state">
                      <Bell size={40} className="nc-empty-icon" />
                      <p className="nc-empty-text">Сповіщень поки немає</p>
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
                                {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                        Системні сповіщення
                      </h4>
                      <p className="nc-permission-text">
                        Дозвольте надсилати сповіщення, щоб не пропустити відключення.
                      </p>
                      <button
                        onClick={requestPermission}
                        className="nc-permission-btn"
                      >
                        Увімкнути
                      </button>
                    </div>
                  )}

                  {permission === 'denied' && (
                    <div className="nc-permission-block denied">
                      <p className="nc-denied-text">
                        Сповіщення заблоковано в налаштуваннях браузера.
                      </p>
                    </div>
                  )}

                  {permission === 'granted' && (
                    <div className={`nc-push-block ${isPushEnabled ? 'enabled' : 'disabled'}`}>
                      <div className="nc-push-row">
                        <div>
                          <h4 className="nc-permission-header">
                            <CheckCircle size={16} />
                            Веб-пуш {isPushEnabled ? 'увімкнено' : 'вимкнено'}
                          </h4>
                          <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                            {isPushEnabled ? 'Сповіщення надходять навіть коли сайт закритий' : 'Натисніть кнопку для активації'}
                          </p>
                        </div>
                        <button
                          onClick={isPushEnabled ? unsubscribeToPush : subscribeToPush}
                          className={`nc-push-toggle-btn ${isPushEnabled ? 'disable' : 'enable'}`}
                        >
                          {isPushEnabled ? 'Вимкнути' : 'Увімкнути'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="nc-settings-container">

                    {[
                      {
                        id: 'silentMode',
                        label: 'Тихий режим',
                        sub: 'Без системних сповіщень, тільки в панелі',
                        val: settings.silentMode
                      },
                      {
                        id: 'lightAlerts',
                        label: 'Сповіщення про світло',
                        sub: 'За 30 хв до події',
                        val: settings.lightAlerts
                      },
                      {
                        id: 'nightMode',
                        label: 'Не турбувати вночі',
                        sub: 'Тиша з 22:00 до 08:00',
                        val: settings.nightMode
                      },
                      {
                        id: 'scheduleUpdates',
                        label: 'Зміни графіку',
                        sub: 'Оновлення даних',
                        val: settings.scheduleUpdates
                      },
                      {
                        id: 'tomorrowSchedule',
                        label: 'Графік на завтра',
                        sub: 'Нові публікації',
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