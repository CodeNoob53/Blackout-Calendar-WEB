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

      <div style={{ opacity: 0.6 }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>
          © {new Date().getFullYear()} Blackout Calendar.
        </p>
        <p style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>
          Дані отримані з відкритих джерел
        </p>
      </div>
    </footer>
  );
};

export default Footer;