import React from 'react';
import { useTranslation } from 'react-i18next';
import { Github } from 'lucide-react';

const Footer: React.FC = () => {
  const { t } = useTranslation(['ui', 'common']);

  return (
    <footer className="app-footer">
      <nav className="github-links" aria-label={t('common:appTitle')}>
        <a
          href="https://github.com/CodeNoob53/blackout_calendar"
          target="_blank"
          rel="noopener noreferrer"
          className="github-btn"
        >
          <Github size={16} aria-hidden="true" />
          <span>{t('ui:footer.apiLink')}</span>
        </a>

        <a
          href="https://github.com/CodeNoob53/Blackout-Calendar-WEB"
          target="_blank"
          rel="noopener noreferrer"
          className="github-btn"
        >
          <Github size={16} aria-hidden="true" />
          <span>{t('ui:footer.webLink')}</span>
        </a>
      </nav>

      <div className="footer-info">
        <p className="footer-copyright">
          {t('ui:footer.copyright', { year: new Date().getFullYear() })}
        </p>
        <p className="footer-disclaimer">
          {t('ui:footer.disclaimer')}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
