import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  const hoverClass = onClick ? 'cursor-pointer hover:border-(--mm-accent)/50 transition-all' : '';
  return (
    <div
      onClick={onClick}
      className={'bg-[#1A1D28] border border-[#232736] rounded-xl p-5 shadow-lg ' + hoverClass + ' ' + className}
    >
      {children}
    </div>
  );
};
