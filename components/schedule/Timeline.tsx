import React from 'react';
import { Interval } from '../../types';
import { getPercentage, getDurationPercentage, getCurrentTimePercentage } from '../../utils/timeHelper';

interface TimelineProps {
  intervals: Interval[];
  isToday: boolean;
}

const Timeline: React.FC<TimelineProps> = ({ intervals, isToday }) => {
  const currentTimePct = getCurrentTimePercentage();

  // Create markers for every 4 hours
  const markers = [0, 4, 8, 12, 16, 20, 24];

  return (
    <div className="relative w-full h-20 mt-8 mb-4 select-none">
      {/* Background track (Light indicates power ON) - Z-0 */}
      <div className="absolute top-0 left-0 w-full h-10 rounded-lg overflow-hidden ring-1 transition-colors duration-300 transform-gpu z-0
        bg-gradient-to-r from-nature-500 via-nature-400 to-nature-500 shadow-[0_0_20px_rgba(139,195,74,0.3)] ring-black/5
        dark:bg-gradient-to-r dark:from-amber-500 dark:via-amber-400 dark:to-amber-500 dark:shadow-[0_0_20px_rgba(245,158,11,0.15)] dark:ring-white/10">
        
        {/* Render Outage Blocks (Dark overlays) - Z-10 */}
        {intervals.map((interval, idx) => {
          const left = getPercentage(interval.start);
          const width = getDurationPercentage(interval.start, interval.end);
          
          return (
            <div
              key={idx}
              className="absolute top-0 h-full flex items-center justify-center group border-x transition-colors duration-300 z-10
              bg-blue-grey-800/90 border-blue-grey-700/50
              dark:bg-[#1e293b] dark:border-gray-800/50"
              style={{ left: `${left}%`, width: `${width}%` }}
            >
               {/* Pattern for aesthetic */}
               <div className="w-full h-full opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxwYXRoIGQ9Ik0wIDBMNCA0Wk00IDBMMCA0WiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+')]"></div>
            </div>
          );
        })}

        {/* Current Time Indicator - Z-20 */}
        {isToday && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
            style={{ left: `${currentTimePct}%` }}
          >
            <div className="absolute -top-1 -left-[3px] w-2 h-2 bg-red-500 rounded-full shadow-[0_0_4px_rgba(239,68,68,1)]"></div>
          </div>
        )}
      </div>

      {/* Time Markers */}
      <div className="absolute top-11 left-0 w-full flex justify-between text-[10px] font-mono font-medium transition-colors
        text-nature-900/60 dark:text-gray-500">
        {markers.map((hour) => (
          <div key={hour} className="relative">
             <span className="absolute transform -translate-x-1/2">
               {hour.toString().padStart(2, '0')}
             </span>
             {/* Tick mark */}
             <div className="absolute -top-2 left-0 h-1 w-px transform -translate-x-1/2 transition-colors
               bg-nature-800/20 dark:bg-gray-700"></div>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="absolute -bottom-1 w-full flex justify-center gap-6 text-[10px] font-bold tracking-widest uppercase transition-colors
        text-nature-800/80 dark:text-gray-500">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full mr-2 transition-colors
            bg-nature-500 shadow-[0_0_5px_rgba(139,195,74,0.5)]
            dark:bg-amber-500 dark:shadow-[0_0_5px_rgba(245,158,11,0.5)]"></div>
          <span>Світло є</span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full mr-2 border transition-colors
            bg-blue-grey-800 border-blue-grey-600
            dark:bg-[#1e293b] dark:border-gray-600"></div>
          <span>Відключення</span>
        </div>
      </div>
    </div>
  );
};

export default Timeline;