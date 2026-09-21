import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'verified' | 'warning' | 'error' | 'info' | 'default';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const styles = {
    verified: 'bg-[#00D68F]/15 text-[#00D68F] border-[#00D68F]/30',
    warning: 'bg-[#FFB300]/15 text-[#FFB300] border-[#FFB300]/30',
    error: 'bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/30',
    info: 'bg-(--mm-accent)/15 text-(--mm-accent) border-(--mm-accent)/30',
    default: 'bg-[#232736] text-[#A0A6B8] border-[#232736]',
  }[variant];

  return (
    <span className={'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ' + styles + ' ' + className}>
      {children}
    </span>
  );
};
