import React from 'react';
import { Github } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="max-w-3xl mx-auto px-4 py-8 pb-12 text-center space-y-6">
      {/* GitHub Links */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
        <a
          href="https://github.com/CodeNoob53/blackout_calendar"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300
            bg-white/40 hover:bg-white text-nature-800 hover:text-nature-900 border border-nature-900/5 hover:border-nature-200 shadow-sm hover:shadow-md
            dark:bg-gray-800/30 dark:hover:bg-gray-800 dark:text-gray-400 dark:hover:text-white dark:border-white/5 dark:hover:border-white/10"
        >
          <Github className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span className="text-xs font-bold tracking-wide">Blackout Calendar API</span>
        </a>

        <a
          href="https://github.com/CodeNoob53/Blackout-Calendar-WEB"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300
            bg-white/40 hover:bg-white text-nature-800 hover:text-nature-900 border border-nature-900/5 hover:border-nature-200 shadow-sm hover:shadow-md
            dark:bg-gray-800/30 dark:hover:bg-gray-800 dark:text-gray-400 dark:hover:text-white dark:border-white/5 dark:hover:border-white/10"
        >
          <Github className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span className="text-xs font-bold tracking-wide">Blackout Calendar WEB</span>
        </a>
      </div>

      {/* Copyright info */}
      <div className="space-y-1 opacity-60 hover:opacity-100 transition-opacity duration-300">
        <p className="text-sm text-nature-900 dark:text-gray-500 font-medium">
          © {new Date().getFullYear()} Blackout Calendar.
        </p>
        <p className="text-[10px] text-nature-700 dark:text-gray-600 uppercase tracking-wider">
          Дані отримані з відкритих джерел
        </p>
      </div>
    </footer>
  );
};

export default Footer;