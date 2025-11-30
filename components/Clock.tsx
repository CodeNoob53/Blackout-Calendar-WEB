import React, { useState, useEffect } from 'react';

const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');

  return (
    <div className="flex flex-col items-center justify-center w-full h-full rounded-[1.5rem] border shadow-inner backdrop-blur-sm transition-all duration-300
      bg-white/70 border-white/60
      dark:bg-gray-800/40 dark:border-white/5">
      <span className="text-xs uppercase font-bold tracking-wider mb-1 transition-colors
        text-nature-800/80 dark:text-gray-400">
        Зараз
      </span>
      <div className="flex items-center justify-center text-2xl font-bold leading-none transition-colors
        text-nature-800 dark:text-amber-500">
        <span>{hours}</span>
        <span className="animate-blink mx-0.5 pb-1 text-nature-600 dark:text-gray-500">:</span>
        <span>{minutes}</span>
      </div>
    </div>
  );
};

export default Clock;