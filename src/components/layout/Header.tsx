import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, RefreshCw, WifiOff } from 'lucide-react';
import NotificationCenter from '../notifications/NotificationCenter';
import ThemeToggle from '../ui/ThemeToggle';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import BurgerButton from '../ui/BurgerButton';
import BurgerMenu from './BurgerMenu';
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
  const { t } = useTranslation(['common', 'ui']);
  const [showBanner, setShowBanner] = useState(false);
  const [isBurgerOpen, setIsBurgerOpen] = useState(false);

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

  // NotificationCenter як окремий компонент для передачі в BurgerMenu
  const notificationButton = (
    <NotificationCenter currentQueueData={currentQueueData} isToday={isToday} />
  );

  return (
    <header className="app-header">
      <div className="container header-content">
        <div className="header-logo">
          <div className="logo-icon-box">
            <Zap size={24} strokeWidth={2.5} fill="currentColor" />
          </div>
          <div className="header-title">
            <h1>
              {t('common:appTitle')}
            </h1>
            <p>{t('common:appSubtitle')}</p>
          </div>
        </div>

        <div className="header-controls flex-center" style={{ gap: '0.75rem' }}>
          {status === 'loading' && (
            <RefreshCw size={16} className="spin-icon" style={{ color: 'var(--primary-color)' }} />
          )}

          {/* Desktop controls */}
          <div className="header-desktop-controls">
            {notificationButton}
            <LanguageSwitcher isMobile={false} />
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>

          {/* Mobile burger button */}
          <BurgerButton
            onClick={() => setIsBurgerOpen(true)}
            isOpen={isBurgerOpen}
          />
        </div>
      </div>

      {showBanner && (
         <div className="offline-banner">
            <WifiOff size={12} />
            {t('ui:header.offline')}
         </div>
      )}

      <BurgerMenu
        isOpen={isBurgerOpen}
        onClose={() => setIsBurgerOpen(false)}
        theme={theme}
        toggleTheme={toggleTheme}
        currentQueueData={currentQueueData}
        isToday={isToday}
      />
    </header>
  );
};

export default Header;
