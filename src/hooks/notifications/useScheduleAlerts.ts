import { useEffect, useRef } from 'react';
import { TFunction } from 'i18next';
import { NotificationItem, NotificationSettings, QueueData } from '../../types';
import { timeToMinutes } from '../../utils/timeHelper';

interface UseScheduleAlertsParams {
  settings: NotificationSettings;
  currentQueueData?: QueueData;
  isToday: boolean;
  t: TFunction;
  addNotification: (input: Omit<NotificationItem, 'id' | 'date' | 'read'>) => void;
  sendSystemNotification: (title: string, body: string) => void;
}

export const useScheduleAlerts = ({
  settings,
  currentQueueData,
  isToday,
  t,
  addNotification,
  sendSystemNotification
}: UseScheduleAlertsParams) => {
  const processedAlerts = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!settings.lightAlerts || !currentQueueData || !isToday) return;

    const shouldNotify = (minutesUntilEvent: number) => minutesUntilEvent > 0 && minutesUntilEvent <= 30;

    const checkAlerts = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentSeconds = now.getSeconds();
      const currentTotalMinutes = currentHours * 60 + currentMinutes + currentSeconds / 60;

      if (settings.nightMode) {
        if (currentHours >= 22 || currentHours < 8) return;
      }

      currentQueueData.intervals.forEach(interval => {
        const startMin = timeToMinutes(interval.start);
        let endMin = timeToMinutes(interval.end);
        let normalizedNow = currentTotalMinutes;

        if (endMin < startMin) {
          endMin += 1440;
          if (normalizedNow < startMin) {
            normalizedNow += 1440;
          }
        }

        const timeUntilOff = startMin - normalizedNow;
        const offAlertId = `${new Date().toDateString()}-${interval.start}-off`;

        if (shouldNotify(timeUntilOff) && !processedAlerts.current.has(offAlertId)) {
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

        const timeUntilOn = endMin - normalizedNow;
        const onAlertId = `${new Date().toDateString()}-${interval.end}-on`;

        if (shouldNotify(timeUntilOn) && !processedAlerts.current.has(onAlertId)) {
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
    };

    checkAlerts();
    const checkInterval = setInterval(checkAlerts, 60000);

    return () => clearInterval(checkInterval);
  }, [
    settings.lightAlerts,
    settings.nightMode,
    currentQueueData,
    isToday,
    t,
    addNotification,
    sendSystemNotification
  ]);
};
