import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Languages, Check, ChevronRight } from 'lucide-react';

interface LanguageSwitcherProps {
  isMobile?: boolean; // Для різних стилів в header vs burger menu
}

const LANGUAGES = [
  { code: 'uk', label: 'Українська', flag: '🇺🇦' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ isMobile = false }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const currentLang = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.right - 160 // Approximate width of dropdown
      });
    }
  };

  useEffect(() => {
    if (isOpen && !isMobile) {
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, isMobile]);

  // Закриття dropdown при кліку поза ним
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (isMobile) {
    // Версія для бургер-меню (аккордеон)
    return (
      <div className={`burger-menu-language-accordion ${isOpen ? 'open' : ''}`}>
        <button
          className="burger-menu-item accordion-trigger"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="burger-menu-item-label flex-center" style={{ gap: '0.75rem' }}>
            <Languages size={20} style={{ color: 'var(--text-muted)' }} />
            <span>{currentLang.label}</span>
          </div>
          <ChevronRight
            size={18}
            className={`accordion-chevron ${isOpen ? 'rotated' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          />
        </button>
        <div className="accordion-content">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`language-option ${i18n.language === lang.code ? 'active' : ''}`}
            >
              <div className="flex-center" style={{ gap: '0.75rem' }}>
                <span className="language-flag">{lang.flag}</span>
                <span className="language-label">{lang.label}</span>
              </div>
              {i18n.language === lang.code && <Check size={16} className="language-check" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Версія для desktop header (dropdown)
  return (
    <div className="language-switcher">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="icon-btn"
        aria-label={`Change language. Current: ${currentLang.label}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Languages size={20} />
      </button>

      {isOpen && createPortal(
        <div 
          className="language-dropdown" 
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 1000
          }}
        >
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`language-dropdown-item ${i18n.language === lang.code ? 'active' : ''}`}
            >
              <span className="language-flag">{lang.flag}</span>
              <span className="language-label">{lang.label}</span>
              {i18n.language === lang.code && <Check size={14} />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export default LanguageSwitcher;
