import React from 'react';
import { Interval } from '../../types';
import { getPercentage, getDurationPercentage, getCurrentTimePercentage } from '../../utils/timeHelper';
import '../../styles/components/timeline.css';

interface TimelineProps {
  intervals: Interval[];
  isToday: boolean;
}

const Timeline: React.FC<TimelineProps> = ({ intervals, isToday }) => {
  const currentTimePct = getCurrentTimePercentage();

  // Create markers for every 4 hours
  const markers = [0, 4, 8, 12, 16, 20, 24];

  return (
    <div className="timeline">
      {/* Background track (Light indicates power ON) */}
      <div className="timeline__track">

        {/* Render Outage Blocks (Dark overlays) */}
        {intervals.map((interval, idx) => {
          const left = getPercentage(interval.start);
          const width = getDurationPercentage(interval.start, interval.end);

          return (
            <div
              key={idx}
              className="timeline__outage"
              style={{ left: `${left}%`, width: `${width}%` }}
            >
               {/* Pattern for aesthetic */}
               <div className="timeline__outage-pattern"></div>
            </div>
          );
        })}

        {/* Current Time Indicator */}
        {isToday && (
          <div
            className="timeline__current-time"
            style={{ left: `${currentTimePct}%` }}
          >
            <div className="timeline__current-time-dot"></div>
          </div>
        )}
      </div>

      {/* Time Markers */}
      <div className="timeline__markers">
        {markers.map((hour) => (
          <div key={hour} className="timeline__marker">
             <span className="timeline__marker-label">
               {hour.toString().padStart(2, '0')}
             </span>
             {/* Tick mark */}
             <div className="timeline__marker-tick"></div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="timeline__legend">
        <div className="timeline__legend-item">
          <div className="timeline__legend-indicator timeline__legend-indicator--power-on"></div>
          <span>Світло є</span>
        </div>
        <div className="timeline__legend-item">
          <div className="timeline__legend-indicator timeline__legend-indicator--outage"></div>
          <span>Відключення</span>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
