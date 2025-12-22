import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  X,
  Github,
  Settings,
  Info,
  FileText,
  HelpCircle,
  Package,
  Moon,
  Sun,
  Bell,
  ChevronRight
} from 'lucide-react';
import NotificationCenter from '../notifications/NotificationCenter';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { APP_VERSION } from '../../constants/version';

interface BurgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currentQueueData?: any;
  isToday: boolean;
  onOpenNotifications: () => void;
  onOpenChangelog: () => void;
  unreadNotificationsCount?: number;
}

const BurgerMenu: React.FC<BurgerMenuProps> = ({
  isOpen,
  onClose,
  theme,
  toggleTheme,
  currentQueueData,
  isToday,
  onOpenNotifications,
  onOpenChangelog,
  unreadNotificationsCount = 0
}) => {
  const { t } = useTranslation(['common', 'ui']);
  const menuRef = useFocusTrap(isOpen);

  // Закриття меню на Escape та управління класом body
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('menu-open');
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="burger-backdrop" onClick={onClose} />

      {/* Menu Content */}
      <div
        ref={menuRef}
        className="burger-menu"
        role="dialog"
        aria-modal="true"
        aria-labelledby="burger-menu-title"
      >
        {/* Header */}
        <div className="burger-menu-header">
          <h3 id="burger-menu-title" className="burger-menu-title">
            {t('common:settings')}
          </h3>
          <button
            onClick={onClose}
            className="burger-close-btn"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="burger-menu-body">

          {/* Налаштування секція */}
          <div className="burger-menu-section">
            <h4 className="burger-menu-section-title">
              <Settings size={16} />
              {t('common:settings')}
            </h4>

            {/* Мова */}
            <LanguageSwitcher isMobile={true} />
            
            {/* Тема */}
            <button className="burger-menu-item" onClick={toggleTheme}>
              <div className="burger-menu-item-label flex-center" style={{ gap: '0.75rem' }}>
                {theme === 'dark' ? (
                  <Moon size={20} style={{ color: 'var(--text-muted)' }} />
                ) : (
                  <Sun size={20} style={{ color: 'var(--text-muted)' }} />
                )}
                <span>{t('common:theme')}</span>
              </div>
              <div className="burger-menu-item-status">
                {theme === 'dark' ? t('common:dark') : t('common:light')}
              </div>
            </button>

            <NotificationCenter
              currentQueueData={currentQueueData}
              isToday={isToday}
              renderTrigger={() => (
                <button className="burger-menu-item" onClick={onOpenNotifications}>
                  <div className="burger-menu-item-label flex-center" style={{ gap: '0.75rem' }}>
                    <Bell size={20} style={{ color: 'var(--text-muted)' }} />
                    <span>{t('common:notifications')}</span>
                  </div>
                  {unreadNotificationsCount > 0 && (
                    <span className="badge-notification">{unreadNotificationsCount}</span>
                  )}
                  <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                </button>
              )}
            />
          </div>

          {/* Навігаційні посилання */}
          <div className="burger-menu-section">
            <h4 className="burger-menu-section-title">
              <Github size={16} />
              GitHub
            </h4>
            <a
              href="https://github.com/CodeNoob53/blackout_calendar"
              target="_blank"
              rel="noopener noreferrer"
              className="burger-menu-link"
            >
              <Github size={20} />
              <span>{t('ui:footer.apiLink')}</span>
            </a>
            <a
              href="https://github.com/CodeNoob53/Blackout-Calendar-WEB"
              target="_blank"
              rel="noopener noreferrer"
              className="burger-menu-link"
            >
              <Github size={20} />
              <span>{t('ui:footer.webLink')}</span>
            </a>
          </div>

          {/* Інформація */}
          <div className="burger-menu-section">
            <h4 className="burger-menu-section-title">
              <Info size={16} />
              {t('ui:footer.about')}
            </h4>
            <button className="burger-menu-link" disabled>
              <Package size={20} />
              <span>{t('ui:footer.version')}: {APP_VERSION}</span>
            </button>
            <button
              className="burger-menu-link"
              onClick={() => {
                onOpenChangelog();
                onClose();
              }}
            >
              <FileText size={20} />
              <span>{t('ui:footer.changelog')}</span>
            </button>
            <button className="burger-menu-link" disabled>
              <HelpCircle size={20} />
              <span>{t('ui:footer.help')}</span>
            </button>
          </div>
        </div>
      </div>

    </>,
    document.body
  );
};

export default BurgerMenu;
