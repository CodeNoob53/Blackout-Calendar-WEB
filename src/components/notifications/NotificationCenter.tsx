import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Bell, X, Trash2, Check, AlertTriangle, CheckCircle, Calendar, MessageSquare, ChevronLeft } from 'lucide-react';
import { QueueData } from '../../types';
import { useNotificationHistory } from '../../hooks/notifications/useNotificationHistory';
import { useNotificationSettings } from '../../hooks/notifications/useNotificationSettings';
import { useSystemNotification } from '../../hooks/notifications/useSystemNotification';
import { usePushNotifications } from '../../hooks/notifications/usePushNotifications';
import { useScheduleAlerts } from '../../hooks/notifications/useScheduleAlerts';
import { useScheduleUpdatesPolling } from '../../hooks/notifications/useScheduleUpdatesPolling';
import { useServiceWorkerNotifications } from '../../hooks/notifications/useServiceWorkerNotifications';

interface NotificationCenterProps {
  currentQueueData?: QueueData;
  isToday: boolean;
  renderTrigger?: (unreadCount: number, onClick: () => void) => React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onBack?: () => void;
}

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

  const setIsOpen = useCallback((value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setUncontrolledIsOpen(value);
    }
  }, [onOpenChange]);

  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');

  const { settings, setSettings } = useNotificationSettings();
  const { notifications, addNotification, markAllRead, clearHistory, unreadCount } = useNotificationHistory();
  const sendSystemNotification = useSystemNotification();

  const { permission, isPushEnabled, requestPermission, subscribeToPush, unsubscribeToPush } = usePushNotifications({
    currentQueue: currentQueueData?.queue,
    t,
    addNotification,
    sendSystemNotification
  });

  useScheduleAlerts({
    settings,
    currentQueueData,
    isToday,
    t,
    addNotification,
    sendSystemNotification
  });

  useScheduleUpdatesPolling({
    enabledNew: settings.tomorrowSchedule,
    enabledChanged: settings.scheduleUpdates,
    t,
    addNotification,
    sendSystemNotification
  });

  const handleOpenPanel = useCallback(() => {
    setIsOpen(true);
    setActiveTab('notifications');
  }, [setIsOpen]);

  const handlePushNotification = useCallback((payload: { title: string; message: string; type?: string; timestamp?: string; isEmergency: boolean; }) => {
    const baseType = payload.type === 'warning' || payload.type === 'success' ? payload.type : 'info';
    const type = payload.isEmergency ? 'warning' : baseType;

    addNotification({
      title: payload.title,
      message: payload.message,
      type,
      timestamp: payload.timestamp
    });
  }, [addNotification]);

  useServiceWorkerNotifications({
    i18nLanguage: i18n.language,
    onPushNotification: handlePushNotification,
    onOpenPanel: handleOpenPanel
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });

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
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');

      const hasUnread = notifications.some(n => !n.read);
      if (hasUnread) {
        markAllRead();
      }
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen, notifications, markAllRead]);

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
