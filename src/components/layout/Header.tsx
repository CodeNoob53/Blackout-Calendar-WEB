import React, { useState, useEffect } from 'react';
import { Zap, RefreshCw, WifiOff } from 'lucide-react';
import NotificationCenter from '../notifications/NotificationCenter';
import ThemeToggle from '../ui/ThemeToggle';
import { QueueData, FetchStatus } from '../../types';
import '../../styles/components/header.css';

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
    <header className="header">
      <div className="header__container">
        <div className="header__branding">
          <div className="header__logo">
            <Zap className="header__logo-icon" strokeWidth={2.5} fill="currentColor" />
          </div>
          <div>
            <h1 className="header__title">
              Світло <span className="header__title-accent">Є</span>?
            </h1>
            <p className="header__subtitle">
              Графік відключень
            </p>
          </div>
        </div>

        <div className="header__actions">
          {status === 'loading' && (
            <RefreshCw className="header__loader" />
          )}
          <NotificationCenter currentQueueData={currentQueueData} isToday={isToday} />
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </div>

      {/* Connection Status Banner with delay */}
      {showBanner && (
         <div className="header__banner">
            <WifiOff className="header__banner-icon" />
            Сервер не відповідає. Показано збережену версію графіку.
         </div>
      )}
    </header>
  );
};

export default Header;