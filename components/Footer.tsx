import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="max-w-3xl mx-auto px-4 py-8 text-center">
      <p className="text-sm text-gray-600 dark:text-gray-600">© {new Date().getFullYear()} Blackout Calendar.</p>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-700">Дані отримані з відкритих джерел.</p>
    </footer>
  );
};

export default Footer;