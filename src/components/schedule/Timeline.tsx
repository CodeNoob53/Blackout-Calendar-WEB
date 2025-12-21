import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Interval } from '../../types';
import { getPercentage, getDurationPercentage, getCurrentTimePercentage } from '../../utils/timeHelper';

interface TimelineProps {
  intervals: Interval[];
  isToday: boolean;
}

const Timeline: React.FC<TimelineProps> = ({ intervals, isToday }) => {
  const { t } = useTranslation('ui');
  const [currentTimePct, setCurrentTimePct] = useState(getCurrentTimePercentage());
  const markers = Array.from({ length: 25 }, (_, i) => i);

  useEffect(() => {
    if (!isToday) return;

    // Оновлюємо кожну хвилину
    const interval = setInterval(() => {
      setCurrentTimePct(getCurrentTimePercentage());
    }, 60000);

    // Оновити одразу при монтуванні, щоб уникнути рассинхрону
    setCurrentTimePct(getCurrentTimePercentage());

    return () => clearInterval(interval);
  }, [isToday]);

  return (
    <div className="timeline-container">
      {/* Background track */}
      <div className="timeline-track">

        {/* Outage Blocks */}
        {intervals.map((interval, idx) => {
          const left = getPercentage(interval.start);
          const width = getDurationPercentage(interval.start, interval.end);

          return (
            <div
              key={idx}
              className="timeline-block"
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              <div className="timeline-pattern"></div>
            </div>
          );
        })}

        {/* Current Time Indicator */}
        {isToday && (
          <div
            className="timeline-current-line"
            style={{ left: `${currentTimePct}%` }}
          >
            <div className="timeline-current-dot"></div>
          </div>
        )}
      </div>

      {/* Time Markers */}
      <div className="timeline-markers">
        {markers.map((hour) => (
          <div key={hour} className="marker-item">
            {hour % 2 === 0 && (
              <span className="marker-label">
                {hour.toString().padStart(2, '0')}
              </span>
            )}
            <div className="marker-tick"></div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="timeline-legend">
        <div className="legend-item">
          <div className="legend-dot light"></div>
          <span>{t('timeline.hasPower')}</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot dark"></div>
          <span>{t('timeline.outage')}</span>
        </div>
      </div>
    </div>
  );
};

export default Timeline;