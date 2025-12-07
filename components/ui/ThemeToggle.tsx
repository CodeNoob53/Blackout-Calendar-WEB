import React from 'react';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
  return (
    <button
      onClick={toggleTheme}
      className="icon-btn"
      aria-label="Toggle theme"
    >
      <div className="flex-center">
        {theme === 'dark' ? (
          <Moon size={20} fill="currentColor" />
        ) : (
          <Sun size={20} fill="currentColor" />
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;