import React from 'react';
import { Menu } from 'lucide-react';

interface BurgerButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

const BurgerButton: React.FC<BurgerButtonProps> = ({ onClick, isOpen }) => {
  return (
    <button
      onClick={onClick}
      className="burger-button"
      aria-label="Open navigation menu"
      aria-expanded={isOpen}
    >
      <Menu size={24} />
    </button>
  );
};

export default BurgerButton;
