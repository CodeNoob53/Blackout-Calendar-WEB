import React from 'react';
import { useTranslation } from 'react-i18next';
import { Github } from 'lucide-react';

const Footer: React.FC = () => {
  const { t } = useTranslation('ui');

  return (
    <footer className="app-footer">
      <div className="github-links">
        <a
          href="https://github.com/CodeNoob53/blackout_calendar"
          target="_blank"
          rel="noopener noreferrer"
          className="github-btn"
        >
          <Github size={16} />
          <span>{t('footer.apiLink')}</span>
        </a>

        <a
          href="https://github.com/CodeNoob53/Blackout-Calendar-WEB"
          target="_blank"
          rel="noopener noreferrer"
          className="github-btn"
        >
          <Github size={16} />
          <span>{t('footer.webLink')}</span>
        </a>
      </div>

      <div className="footer-info">
        <p className="footer-copyright">
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </p>
        <p className="footer-disclaimer">
          {t('footer.disclaimer')}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
