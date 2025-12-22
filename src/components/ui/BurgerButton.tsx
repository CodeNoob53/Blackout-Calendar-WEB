import React from 'react';
import { Menu } from 'lucide-react';

interface BurgerButtonProps {
  onClick: () => void;
  isOpen: boolean;
  unreadCount?: number;
}

const BurgerButton: React.FC<BurgerButtonProps> = ({ onClick, isOpen, unreadCount = 0 }) => {
  return (
    <button
      onClick={onClick}
      className="burger-button"
      aria-label="Open navigation menu"
      aria-expanded={isOpen}
    >
      <Menu size={24} />
      {unreadCount > 0 && (
        <span className="badge-dot">
          <span className="badge-ping"></span>
          <span className="badge-solid"></span>
        </span>
      )}
    </button>
  );
};

export default BurgerButton;
