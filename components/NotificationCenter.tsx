import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Trash2, Check, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import { NotificationSettings, NotificationItem, QueueData } from '../types';
import { fetchNewSchedules, fetchChangedSchedules } from '../services/api';
import { timeToMinutes } from '../utils/timeHelper';

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
  
  // 3) & 4) Persistence check: Settings and History are loaded/saved to localStorage
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

  // Toggle Logic with Position Calculation
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
          addNotification({
            title: 'Світло зникне скоро',
            message: `Увага! Відключення заплановано на ${interval.start}.`,
            type: 'warning'
          });
          processedAlerts.current.add(offAlertId);
        }

        const timeUntilOn = endMin - currentTotalMinutes;
        const onAlertId = `${new Date().toDateString()}-${interval.end}-on`;

        if (timeUntilOn === 30 && !processedAlerts.current.has(onAlertId)) {
          addNotification({
            title: 'Світло зʼявиться скоро',
            message: `За графіком включення очікується о ${interval.end}.`,
            type: 'success'
          });
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
                addNotification({
                  title: 'Новий графік',
                  message: item.pushMessage || `Доступний графік на ${item.date}`,
                  type: 'info'
                });
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
                addNotification({
                  title: 'Зміни в графіку',
                  message: item.pushMessage || `Внесено зміни в графік на ${item.date}`,
                  type: 'warning'
                });
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
        className="p-2 rounded-xl border relative transition-all duration-200
        bg-white/70 border-nature-700/10 hover:bg-white/90 text-nature-800
        dark:bg-gray-800/50 dark:border-white/5 dark:hover:bg-gray-700/50 dark:text-amber-500"
      >
        <Bell className="h-5 w-5 fill-current" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
        )}
      </button>

      {isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[90]" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal Content */}
          <div 
            className="fixed z-[100] bg-white dark:bg-[#0F172A] shadow-2xl overflow-hidden border transition-colors duration-300
              border-nature-200 dark:border-white/10
              animate-in fade-in zoom-in-95 duration-200
              inset-x-0 bottom-0 top-auto rounded-t-2xl sm:inset-auto sm:w-96 sm:rounded-2xl"
            style={{
               // On Desktop, position relative to button
               top: window.innerWidth >= 640 ? position.top : 'auto',
               right: window.innerWidth >= 640 ? position.right : 0,
            }}
          >
            
            {/* Header Tabs */}
            <div className="flex items-center justify-between px-4 py-3 border-b transition-colors duration-300
              bg-nature-50/80 border-nature-200
              dark:bg-[#1e293b] dark:border-white/10">
               <div className="flex space-x-6">
                  <button 
                    onClick={() => setActiveTab('notifications')}
                    className={`text-sm font-bold transition-colors ${
                      activeTab === 'notifications' 
                      ? 'text-nature-700 dark:text-amber-500' 
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
                    }`}
                  >
                    Сповіщення ({unreadCount})
                  </button>
                  <button 
                     onClick={() => setActiveTab('settings')}
                     className={`text-sm font-bold transition-colors ${
                       activeTab === 'settings' 
                       ? 'text-nature-700 dark:text-amber-500' 
                       : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
                     }`}
                  >
                     Налаштування
                  </button>
               </div>
               <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors">
                  <X className="h-5 w-5" />
               </button>
            </div>

            {/* Content Area */}
            <div className="h-[50vh] sm:h-auto sm:max-h-[60vh] overflow-y-auto bg-white dark:bg-[#0F172A]">
              {activeTab === 'notifications' ? (
                <div className="p-3 space-y-3">
                  <div className="flex justify-end gap-3 px-1 mb-2">
                    <button onClick={markAllRead} className="text-[10px] text-gray-500 hover:text-nature-600 dark:text-gray-500 dark:hover:text-amber-500 flex items-center transition-colors">
                      <Check className="h-3 w-3 mr-1" /> Позначити прочитаним
                    </button>
                    <button onClick={clearHistory} className="text-[10px] text-gray-500 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-500 flex items-center transition-colors">
                      <Trash2 className="h-3 w-3 mr-1" /> Очистити
                    </button>
                  </div>
                  
                  {notifications.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center text-gray-400 dark:text-gray-600">
                      <Bell className="h-10 w-10 mb-3 opacity-30" />
                      <p className="text-sm">Сповіщень поки немає</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((n) => (
                        <div key={n.id} className={`relative p-4 rounded-2xl border transition-all duration-200
                          ${n.type === 'warning' 
                            ? 'border-amber-200 bg-amber-50/50 dark:border-amber-500/30 dark:bg-[#1a1a1a]' 
                            : n.type === 'info' 
                              ? 'border-blue-200 bg-blue-50/50 dark:border-blue-500/30 dark:bg-[#1a1a1a]' 
                              : 'border-nature-200 bg-nature-50/50 dark:border-green-500/30 dark:bg-[#1a1a1a]'}
                          hover:bg-nature-50 dark:hover:bg-[#252525]`}
                        >
                          <div className="flex items-start gap-3">
                             {/* Icon */}
                             <div className={`mt-0.5 min-w-[24px] h-6 w-6 flex items-center justify-center rounded-full
                                ${n.type === 'warning' 
                                  ? 'text-amber-600 bg-amber-100 dark:text-amber-500 dark:bg-amber-500/10' 
                                  : n.type === 'success' 
                                    ? 'text-nature-600 bg-nature-100 dark:text-green-500 dark:bg-green-500/10' 
                                    : 'text-blue-600 bg-blue-100 dark:text-blue-500 dark:bg-blue-500/10'}`}
                             >
                               {n.type === 'info' ? <Calendar className="h-3.5 w-3.5" /> :
                                n.type === 'warning' ? <AlertTriangle className="h-3.5 w-3.5" /> :
                                <CheckCircle className="h-3.5 w-3.5" />}
                             </div>

                             {/* Content */}
                             <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold leading-tight mb-1 text-nature-900 dark:text-gray-100">{n.title}</h4>
                                <p className="text-xs leading-relaxed break-words text-nature-700 dark:text-gray-400">{n.message}</p>
                                <span className="text-[10px] font-mono mt-2 block text-gray-500 dark:text-gray-600">
                                  {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                             </div>

                             {/* Unread Indicator */}
                             {!n.read && (
                               <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] flex-shrink-0 mt-1.5" />
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  <div className="rounded-xl border divide-y transition-colors duration-300
                    bg-nature-50/50 border-nature-200 divide-nature-200
                    dark:bg-[#1e293b]/50 dark:border-white/5 dark:divide-white/5">
                    
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
                      <div key={item.id} className="flex items-center justify-center p-4">
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-nature-900 dark:text-gray-200">{item.label}</h4>
                          <p className="text-xs text-nature-500 dark:text-gray-500 mt-0.5">{item.sub}</p>
                        </div>
                        <button 
                          onClick={() => setSettings(s => ({ ...s, [item.id]: !item.val }))}
                          className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0
                            ${item.val ? 'bg-nature-500 dark:bg-amber-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${item.val ? 'translate-x-5' : 'translate-x-0'}`} />
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