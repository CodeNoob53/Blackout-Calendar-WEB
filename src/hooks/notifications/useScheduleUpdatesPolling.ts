import { useEffect, useRef } from 'react';
import { TFunction } from 'i18next';
import { fetchChangedSchedules, fetchNewSchedules } from '../../services/api';
import { NotificationItem } from '../../types';
import { logger } from '../../utils/logger';

interface UseScheduleUpdatesPollingParams {
  enabledNew: boolean;
  enabledChanged: boolean;
  t: TFunction;
  addNotification: (input: Omit<NotificationItem, 'id' | 'date' | 'read'>) => void;
  sendSystemNotification: (title: string, body: string) => void;
}

const loadProcessedUpdateIds = (): Set<string> => {
  try {
    const saved = localStorage.getItem('notification_processed_updates');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch (e) {
    return new Set();
  }
};

const pruneProcessedUpdateIds = (ids: Set<string>, maxAgeDays: number): Set<string> => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);
  const cutoffTime = cutoff.getTime();
  const next = new Set<string>();

  ids.forEach((id) => {
    const parts = id.split('-');
    if (parts.length >= 4) {
      const dateStr = `${parts[1]}-${parts[2]}-${parts[3]}`;
      const parsed = new Date(dateStr);
      if (!Number.isNaN(parsed.getTime()) && parsed.getTime() < cutoffTime) {
        return;
      }
    }
    next.add(id);
  });

  return next;
};

export const useScheduleUpdatesPolling = ({
  enabledNew,
  enabledChanged,
  t,
  addNotification,
  sendSystemNotification
}: UseScheduleUpdatesPollingParams) => {
  const processedUpdateIds = useRef<Set<string>>(loadProcessedUpdateIds());
  const serverUnavailableNotified = useRef(false);

  const notifyServerUnavailable = () => {
    if (serverUnavailableNotified.current) return;

    addNotification({
      title: t('notifications:serverUnavailable'),
      message: t('notifications:serverUnavailableDesc'),
      type: 'warning'
    });

    serverUnavailableNotified.current = true;
  };

  const resetServerUnavailable = () => {
    serverUnavailableNotified.current = false;
  };

  useEffect(() => {
    if (!enabledNew && !enabledChanged) return;
    let isMounted = true;

    const checkForUpdates = async () => {
      const processBatch = (
        items: any[],
        type: 'info' | 'warning',
        idPrefix: string,
        getTitle: (item: any) => string,
        getMsg: (item: any) => string
      ) => {
        const unprocessedItems = items.filter(item => {
          const id = item.updatedAt
            ? `${idPrefix}-${item.date}-${item.updatedAt}`
            : `${idPrefix}-${item.date}-${item.sourcePostId}`;
          return !processedUpdateIds.current.has(id);
        });

        if (unprocessedItems.length === 0) return;

        const byDate: Record<string, any[]> = {};
        unprocessedItems.forEach(item => {
          if (!byDate[item.date]) byDate[item.date] = [];
          byDate[item.date].push(item);
        });

        Object.entries(byDate).forEach(([date, dateItems]) => {
          dateItems.sort((a, b) => {
            const tA = new Date(a.updatedAt || a.messageDate || 0).getTime();
            const tB = new Date(b.updatedAt || b.messageDate || 0).getTime();
            return tB - tA;
          });

          const latestItem = dateItems[0];
          const title = getTitle(latestItem);
          const msg = getMsg(latestItem);

          addNotification({
            title: title,
            message: msg,
            type: type
          });
          sendSystemNotification(title, msg);

          dateItems.forEach(item => {
            const id = item.updatedAt
              ? `${idPrefix}-${item.date}-${item.updatedAt}`
              : `${idPrefix}-${item.date}-${item.sourcePostId}`;
            processedUpdateIds.current.add(id);
          });
        });

        const pruned = pruneProcessedUpdateIds(processedUpdateIds.current, 30);
        processedUpdateIds.current = pruned;
        localStorage.setItem('notification_processed_updates', JSON.stringify(Array.from(pruned)));
      };

      if (enabledNew) {
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
          logger.error('Failed to check new schedules', e);
        }
      }

      if (enabledChanged) {
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
          logger.error('Failed to check changed schedules', e);
        }
      }
    };

    checkForUpdates();
    const pollInterval = setInterval(checkForUpdates, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [enabledNew, enabledChanged, t, addNotification, sendSystemNotification]);
};
