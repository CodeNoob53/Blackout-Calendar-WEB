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
      className="p-2 rounded-xl transition-all duration-300 relative overflow-hidden group border
      bg-white/70 border-nature-700/10 hover:bg-white/90 text-nature-800
      dark:bg-gray-800/50 dark:border-white/5 dark:hover:bg-gray-700/50 dark:text-amber-500"
      aria-label="Toggle theme"
    >
      <div className="relative z-10">
        {theme === 'dark' ? (
          <Moon className="h-5 w-5 fill-current" />
        ) : (
          <Sun className="h-5 w-5 fill-current" />
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;