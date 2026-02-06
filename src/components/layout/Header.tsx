import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, RefreshCw, WifiOff } from 'lucide-react';
import NotificationCenter from '../notifications/NotificationCenter';
import ThemeToggle from '../ui/ThemeToggle';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import BurgerButton from '../ui/BurgerButton';
import BurgerMenu from './BurgerMenu';
import ChangelogModal from '../ui/ChangelogModal';
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  // Спеціальний обробник для відкриття сповіщень з бургер-меню
  const handleOpenNotificationsFromMenu = () => {
    setIsBurgerOpen(false);
    setIsChangelogOpen(false);
    setIsNotificationsOpen(true);
  };

  // Повернення до бургер-меню
  const handleBackToMenu = () => {
    setIsNotificationsOpen(false);
    setIsBurgerOpen(true);
  };

  // Підрахунок непрочитаних сповіщень з localStorage
  useEffect(() => {
    const updateUnreadCount = () => {
      try {
        const saved = localStorage.getItem('notifications_history');
        if (saved) {
          const notifications = JSON.parse(saved);
          const unread = notifications.filter((n: any) => !n.read).length;
          setUnreadCount(unread);
        }
      } catch (e) {
        console.error('Failed to read notifications:', e);
      }
    };

    // Оновлюємо при завантаженні
    updateUnreadCount();

    // Слухаємо зміни в localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'notifications_history') {
        updateUnreadCount();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Періодично перевіряємо (для випадку коли зміни в тому ж табі)
    const interval = setInterval(updateUnreadCount, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

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
          <nav className="header-desktop-controls" aria-label={t('common:settings')}>
            <NotificationCenter
              currentQueueData={currentQueueData}
              isToday={isToday}
              isOpen={isNotificationsOpen}
              onOpenChange={setIsNotificationsOpen}
              onBack={handleBackToMenu}
            />
            <LanguageSwitcher isMobile={false} />
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </nav>

          {/* Mobile burger button */}
          <BurgerButton
            onClick={() => setIsBurgerOpen(true)}
            isOpen={isBurgerOpen}
            unreadCount={unreadCount}
          />
        </div>
      </div>

      {showBanner && (
         <div className="offline-banner" role="alert">
            <WifiOff size={12} aria-hidden="true" />
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
        onOpenNotifications={handleOpenNotificationsFromMenu}
        onOpenChangelog={() => setIsChangelogOpen(true)}
        unreadNotificationsCount={unreadCount}
      />

      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
      />
    </header>
  );
};

export default Header;
