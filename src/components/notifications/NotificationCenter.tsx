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

  const addNotification = (input: Omit<NotificationItem, 'id' | 'date' | 'read'>) => {
    const newItem: NotificationItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      date: Date.now(),
      read: false,
      ...input
    };
    setNotifications(prev => [newItem, ...prev]);
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
          addNotification({
            title: notification.title,
            message: notification.message,
            type: notification.type as 'info' | 'warning' | 'success'
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

      const notificationTypes = ['all'];
      if (subscription.endpoint && currentQueueData) {
        await updateNotificationQueue(subscription.endpoint, currentQueueData.queue, notificationTypes);
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
      updateNotificationQueue(
        pushSubscription.endpoint,
        currentQueueData.queue,
        ['all']
      ).catch(error => {
        console.error('Failed to update queue on backend:', error);
      });
    }
  }, [currentQueueData, pushSubscription]);

  useEffect(() => {
    const checkForUpdates = async () => {
      if (settings.tomorrowSchedule) {
        try {
          const data = await fetchNewSchedules(24);
          if (data.success && data.count > 0) {
            data.schedules.forEach(item => {
              const id = `new-${item.date}-${item.sourcePostId}`;
              if (!processedUpdateIds.current.has(id)) {
                const title = 'Новий графік';
                const msg = item.pushMessage || `Доступний графік на ${item.date}`;

                addNotification({
                  title: title,
                  message: msg,
                  type: 'info'
                });
                sendSystemNotification(title, msg);
                processedUpdateIds.current.add(id);
              }
            });
            localStorage.setItem('notification_processed_updates', JSON.stringify(Array.from(processedUpdateIds.current)));
          }
        } catch (e) {
          console.error("Failed to check new schedules", e);
        }
      }

      if (settings.scheduleUpdates) {
        try {
          const data = await fetchChangedSchedules(24);
          if (data.success && data.count > 0) {
            data.schedules.forEach(item => {
              const id = `change-${item.date}-${item.updatedAt}`;
              if (!processedUpdateIds.current.has(id)) {
                const title = 'Зміни в графіку';
                const msg = item.pushMessage || `Внесено зміни в графік на ${item.date}`;

                addNotification({
                  title: title,
                  message: msg,
                  type: 'warning'
                });
                sendSystemNotification(title, msg);
                processedUpdateIds.current.add(id);
              }
            });
            localStorage.setItem('notification_processed_updates', JSON.stringify(Array.from(processedUpdateIds.current)));
          }
        } catch (e) {
          console.error("Failed to check changed schedules", e);
        }
      }
    };

    checkForUpdates();
    const pollInterval = setInterval(checkForUpdates, 5 * 60 * 1000);
    return () => clearInterval(pollInterval);
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
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '0.75rem', paddingRight: '0.25rem' }}>
                    <button onClick={markAllRead} style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Check size={12} style={{ marginRight: '4px' }} /> Позначити прочитаним
                    </button>
                    <button onClick={clearHistory} style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={12} style={{ marginRight: '4px' }} /> Очистити
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Bell size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                      <p style={{ fontSize: '0.875rem' }}>Сповіщень поки немає</p>
                    </div>
                  ) : (
                    <div>
                      {notifications.map((n) => (
                        <div key={n.id} className={`notification-item ${n.type === 'warning' ? 'notif-warning' : n.type === 'info' ? 'notif-info' : 'notif-success'}`}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <div>
                              {n.type === 'info' ? <Calendar size={20} /> :
                                n.type === 'warning' ? <AlertTriangle size={20} /> :
                                  <CheckCircle size={20} />}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.25rem', lineHeight: 1.2 }}>{n.title}</h4>
                              <p style={{ fontSize: '0.75rem', lineHeight: 1.4, wordBreak: 'break-word' }}>{n.message}</p>
                              <span style={{ fontSize: '10px', fontFamily: 'monospace', marginTop: '0.5rem', display: 'block', color: 'var(--text-muted)' }}>
                                {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {!n.read && (
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0, marginTop: '0.375rem' }} />
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
                    <div style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MessageSquare size={16} />
                        Системні сповіщення
                      </h4>
                      <p style={{ fontSize: '0.75rem', marginBottom: '0.75rem', opacity: 0.8 }}>
                        Дозвольте надсилати сповіщення, щоб не пропустити відключення.
                      </p>
                      <button
                        onClick={requestPermission}
                        style={{ width: '100%', padding: '0.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Увімкнути
                      </button>
                    </div>
                  )}

                  {permission === 'denied' && (
                    <div style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--danger-text)' }}>
                        Сповіщення заблоковано в налаштуваннях браузера.
                      </p>
                    </div>
                  )}

                  {permission === 'granted' && (
                    <div style={{
                      padding: '1rem',
                      marginBottom: '1rem',
                      borderRadius: '0.75rem',
                      background: isPushEnabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                      border: isPushEnabled ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(249, 115, 22, 0.3)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle size={16} />
                            Веб-пуш {isPushEnabled ? 'увімкнено' : 'вимкнено'}
                          </h4>
                          <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                            {isPushEnabled ? 'Сповіщення надходять навіть коли сайт закритий' : 'Натисніть кнопку для активації'}
                          </p>
                        </div>
                        <button
                          onClick={isPushEnabled ? unsubscribeToPush : subscribeToPush}
                          style={{
                            padding: '0.5rem 1rem',
                            background: isPushEnabled ? '#ef4444' : '#22c55e',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          {isPushEnabled ? 'Вимкнути' : 'Увімкнути'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>

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