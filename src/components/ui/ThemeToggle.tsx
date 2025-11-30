import React from 'react';
import { Moon, Sun } from 'lucide-react';
import '../../styles/components/theme-toggle.css';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Moon className="theme-toggle__icon" />
      ) : (
        <Sun className="theme-toggle__icon" />
      )}
    </button>
  );
};

export default ThemeToggle;