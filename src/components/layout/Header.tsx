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

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (isUsingCache) {
      timer = setTimeout(() => {
        setShowBanner(true);
      }, 5000);
    } else {
      setShowBanner(false);
    }

    return () => clearTimeout(timer);
  }, [isUsingCache]);

  return (
    <header className="app-header">
      <div className="container header-content">
        <div className="header-logo">
          <div className="logo-icon-box">
            <Zap size={24} strokeWidth={2.5} fill="currentColor" />
          </div>
          <div className="header-title">
            <h1>
              Світло <span>Є</span>?
            </h1>
            <p>Графік відключень</p>
          </div>
        </div>
        
        <div className="header-controls flex-center" style={{ gap: '0.75rem' }}>
          {status === 'loading' && (
            <RefreshCw size={16} className="spin-icon" style={{ color: 'var(--primary-color)' }} />
          )}
          <NotificationCenter currentQueueData={currentQueueData} isToday={isToday} />
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </div>
      
      {showBanner && (
         <div className="offline-banner">
            <WifiOff size={12} />
            Сервер не відповідає. Показано збережену версію графіку.
         </div>
      )}
    </header>
  );
};

export default Header;