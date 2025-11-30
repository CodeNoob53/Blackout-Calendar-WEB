import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Trash2, Check, AlertTriangle, CheckCircle, Calendar, MessageSquare } from 'lucide-react';
import { NotificationSettings, NotificationItem, QueueData } from '../../types';
import { fetchNewSchedules, fetchChangedSchedules } from '../../services/api';
import { timeToMinutes } from '../../utils/timeHelper';
import '../../styles/components/notification-center.css';

interface NotificationCenterProps {
  currentQueueData?: QueueData;
  isToday: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  lightAlerts: true,
  nightMode: true,
  scheduleUpdates: true,
  tomorrowSchedule: true,
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({ currentQueueData, isToday }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');
  const [permission, setPermission] = useState<NotificationPermission>('default');

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

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

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
        sendSystemNotification('Сповіщення увімкнено!', 'Тепер ви будете отримувати важливі нагадування.');
      }
    } catch (e) {
      console.error(e);
    }
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

  // Alert Logic
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

  // Update Logic
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

  const addNotification = (input: Omit<NotificationItem, 'id' | 'date' | 'read'>) => {
    const newItem: NotificationItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      date: Date.now(),
      read: false,
      ...input
    };
    setNotifications(prev => [newItem, ...prev]);
  };

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
        className="notification-button"
      >
        <Bell className="notification-button__icon" />
        {unreadCount > 0 && (
          <span className="notification-button__badge">
            <span className="notification-button__badge-ping"></span>
            <span className="notification-button__badge-dot"></span>
          </span>
        )}
      </button>

      {isOpen && createPortal(
        <>
          <div
            className="notification-backdrop"
            onClick={() => setIsOpen(false)}
          />

          <div
            className="notification-modal"
            style={{
               top: window.innerWidth >= 640 ? position.top : 'auto',
               right: window.innerWidth >= 640 ? position.right : 0,
            }}
          >
            <div className="notification-modal__header">
               <div className="notification-modal__tabs">
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className={`notification-modal__tab ${activeTab === 'notifications' ? 'notification-modal__tab--active' : ''}`}
                  >
                    Сповіщення ({unreadCount})
                  </button>
                  <button
                     onClick={() => setActiveTab('settings')}
                     className={`notification-modal__tab ${activeTab === 'settings' ? 'notification-modal__tab--active' : ''}`}
                  >
                     Налаштування
                  </button>
               </div>
               <button
                 onClick={() => setIsOpen(false)}
                 className="notification-modal__close"
               >
                  <X className="notification-modal__close-icon" />
               </button>
            </div>

            <div className="notification-modal__content">
              {activeTab === 'notifications' ? (
                <div className="notifications-tab">
                  <div className="notifications-tab__actions">
                    <button onClick={markAllRead} className="notifications-tab__action">
                      <Check className="notifications-tab__action-icon" /> Позначити прочитаним
                    </button>
                    <button onClick={clearHistory} className="notifications-tab__action notifications-tab__action--delete">
                      <Trash2 className="notifications-tab__action-icon" /> Очистити
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="notifications-empty">
                      <Bell className="notifications-empty__icon" />
                      <p className="notifications-empty__text">Сповіщень поки немає</p>
                    </div>
                  ) : (
                    <div className="notifications-list">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`notification-item notification-item--${n.type}`}
                        >
                          <div className="notification-item__content">
                             <div className={`notification-item__icon-wrapper notification-item__icon-wrapper--${n.type}`}>
                               {n.type === 'info' ? <Calendar className="notification-item__icon" /> :
                                n.type === 'warning' ? <AlertTriangle className="notification-item__icon" /> :
                                <CheckCircle className="notification-item__icon" />}
                             </div>

                             <div className="notification-item__body">
                                <h4 className="notification-item__title">{n.title}</h4>
                                <p className="notification-item__message">{n.message}</p>
                                <span className="notification-item__time">
                                  {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                             </div>

                             {!n.read && (
                               <div className="notification-item__unread-dot" />
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="settings-tab">
                  {permission === 'default' && (
                    <div className="permission-banner permission-banner--request">
                       <h4 className="permission-banner__title">
                         <MessageSquare className="permission-banner__title-icon" />
                         Системні сповіщення
                       </h4>
                       <p className="permission-banner__text">
                         Дозвольте надсилати сповіщення, щоб не пропустити відключення, коли сайт згорнуто.
                       </p>
                       <button
                         onClick={requestPermission}
                         className="permission-banner__button"
                       >
                         Увімкнути
                       </button>
                    </div>
                  )}

                  {permission === 'denied' && (
                     <div className="permission-banner permission-banner--denied">
                       <p className="permission-banner__text permission-banner__text--denied">
                         Сповіщення заблоковано в налаштуваннях браузера. Увімкніть їх вручну, щоб отримувати нагадування.
                       </p>
                    </div>
                  )}

                  <div className="settings-list">
                    {[
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
                      <div key={item.id} className="settings-list__item">
                        <div className="settings-list__item-content">
                          <h4 className="settings-list__item-label">{item.label}</h4>
                          <p className="settings-list__item-sublabel">{item.sub}</p>
                        </div>
                        <button
                          onClick={() => setSettings(s => ({ ...s, [item.id]: !item.val }))}
                          className={`toggle-switch ${item.val ? 'toggle-switch--on' : ''}`}
                        >
                          <div className="toggle-switch__handle" />
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
