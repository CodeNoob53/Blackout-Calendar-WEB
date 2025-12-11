import React from 'react';
import { Github } from 'lucide-react';

const Footer: React.FC = () => {
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
          <span>Blackout Calendar API</span>
        </a>

        <a
          href="https://github.com/CodeNoob53/Blackout-Calendar-WEB"
          target="_blank"
          rel="noopener noreferrer"
          className="github-btn"
        >
          <Github size={16} />
          <span>Blackout Calendar WEB</span>
        </a>
      </div>

      <div className="footer-info">
        <p className="footer-copyright">
          © {new Date().getFullYear()} Blackout Calendar.
        </p>
        <p className="footer-disclaimer">
          Дані отримані з відкритих джерел
        </p>
      </div>
    </footer>
  );
};

export default Footer;