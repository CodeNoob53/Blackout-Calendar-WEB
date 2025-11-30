import React from 'react';
import { Github } from 'lucide-react';
import '../../styles/components/footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      {/* GitHub Links */}
      <div className="footer__links">
        <a
          href="https://github.com/CodeNoob53/blackout_calendar"
          target="_blank"
          rel="noopener noreferrer"
          className="footer__link"
        >
          <Github className="footer__link-icon" />
          <span className="footer__link-text">Blackout Calendar API</span>
        </a>

        <a
          href="https://github.com/CodeNoob53/Blackout-Calendar-WEB"
          target="_blank"
          rel="noopener noreferrer"
          className="footer__link"
        >
          <Github className="footer__link-icon" />
          <span className="footer__link-text">Blackout Calendar WEB</span>
        </a>
      </div>

      {/* Copyright info */}
      <div className="footer__info">
        <p className="footer__copyright">
          © {new Date().getFullYear()} Blackout Calendar.
        </p>
        <p className="footer__disclaimer">
          Дані отримані з відкритих джерел
        </p>
      </div>
    </footer>
  );
};

export default Footer;