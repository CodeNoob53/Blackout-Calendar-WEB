import React, { useState, useRef, useEffect } from 'react';
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  // Закриття dropdown при кліку поза ним
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
    <div className="language-switcher" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="icon-btn"
        aria-label={`Change language. Current: ${currentLang.label}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Languages size={20} />
      </button>

      {isOpen && (
        <div className="language-dropdown">
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
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
