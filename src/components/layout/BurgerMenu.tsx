import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  X,
  Github,
  Settings,
  Info,
  FileText,
  HelpCircle,
  Package
} from 'lucide-react';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import ThemeToggle from '../ui/ThemeToggle';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface BurgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  notificationButton: React.ReactNode; // NotificationCenter кнопка
}

const BurgerMenu: React.FC<BurgerMenuProps> = ({
  isOpen,
  onClose,
  theme,
  toggleTheme,
  notificationButton
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
            <div className="burger-menu-item">
              <div className="burger-menu-item-label">
                {t('common:theme')}
              </div>
              <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </div>

            {/* Сповіщення */}
            <div className="burger-menu-item">
              <div className="burger-menu-item-label">
                {t('common:notifications')}
              </div>
              {notificationButton}
            </div>
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
            <button className="burger-menu-link">
              <Package size={20} />
              <span>{t('ui:footer.version')}: 2.1.0</span>
            </button>
            <button className="burger-menu-link">
              <FileText size={20} />
              <span>{t('ui:footer.changelog')}</span>
            </button>
            <button className="burger-menu-link">
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
