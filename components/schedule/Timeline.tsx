import React from 'react';
import { Interval } from '../../types';
import { getPercentage, getDurationPercentage, getCurrentTimePercentage } from '../../utils/timeHelper';

interface TimelineProps {
  intervals: Interval[];
  isToday: boolean;
}

const Timeline: React.FC<TimelineProps> = ({ intervals, isToday }) => {
  const currentTimePct = getCurrentTimePercentage();
  const markers = [0, 4, 8, 12, 16, 20, 24];

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
             <span className="marker-label">
               {hour.toString().padStart(2, '0')}
             </span>
             <div className="marker-tick"></div>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="timeline-legend">
        <div className="legend-item">
          <div className="legend-dot light"></div>
          <span>Світло є</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot dark"></div>
          <span>Відключення</span>
        </div>
      </div>
    </div>
  );
};

export default Timeline;