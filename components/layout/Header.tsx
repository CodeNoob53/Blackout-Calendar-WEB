import React, { useState, useEffect } from 'react';
import { Zap, RefreshCw, WifiOff } from 'lucide-react';
import NotificationCenter from '../notifications/NotificationCenter';
import ThemeToggle from '../ui/ThemeToggle';
import { QueueData, FetchStatus } from '../../types';

interface HeaderProps {
  status: FetchStatus;
  isUsingCache: boolean;
  currentQueueData?: QueueData;
  isToday: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({
  status,
  isUsingCache,
  currentQueueData,
  isToday,
  theme,
  toggleTheme,
}) => {
  const [showBanner, setShowBanner] = useState(false);

  // Debounce the offline/cache banner to prevent flashing during normal navigation
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (isUsingCache) {
      // Wait 5 seconds before showing the banner
      timer = setTimeout(() => {
        setShowBanner(true);
      }, 5000);
    } else {
      // If cache mode is turned off (server responded), hide immediately
      setShowBanner(false);
    }

    return () => clearTimeout(timer);
  }, [isUsingCache]);

  return (
    <header className="sticky top-0 z-40 mb-8 border-b backdrop-blur-xl transition-colors duration-300
      bg-white/70 border-nature-700/10
      dark:border-white/5 dark:bg-[#0f172a]/80">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl shadow-lg transition-colors duration-300
            bg-gradient-to-br from-nature-500 to-nature-700 shadow-nature-500/20
            dark:bg-gradient-to-br dark:from-amber-400 dark:to-amber-600 dark:shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Zap className="h-6 w-6 text-white" strokeWidth={2.5} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none transition-colors duration-300 text-gray-800 dark:text-white">
              Світло <span className="text-nature-600 dark:text-amber-500">Є</span>?
            </h1>
            <p className="text-xs font-medium tracking-wide transition-colors duration-300 text-nature-800 dark:text-gray-400">
              Графік відключень
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {status === 'loading' && (
            <RefreshCw className="h-4 w-4 animate-spin text-nature-600 dark:text-amber-500" />
          )}
          <NotificationCenter currentQueueData={currentQueueData} isToday={isToday} />
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </div>
      
      {/* Connection Status Banner with delay */}
      {showBanner && (
         <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs py-1 px-4 text-center border-b border-amber-200 dark:border-amber-500/10 flex items-center justify-center gap-2 animate-in slide-in-from-top-1">
            <WifiOff className="h-3 w-3" />
            Сервер не відповідає. Показано збережену версію графіку.
         </div>
      )}
    </header>
  );
};

export default Header;