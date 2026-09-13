import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#090A0F] disabled:opacity-50 disabled:cursor-not-allowed';
  
  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  }[size];

  const variantStyles = {
    primary: 'bg-[#2E7CF6] hover:bg-[#438CF9] text-white focus:ring-[#2E7CF6]',
    secondary: 'bg-[#1A1D28] hover:bg-[#232736] text-[#A0A6B8] hover:text-white border border-[#232736] focus:ring-[#30354A]',
    danger: 'bg-[#FF3B30] hover:bg-red-600 text-white focus:ring-[#FF3B30]',
    ghost: 'bg-transparent hover:bg-[#1A1D28] text-[#A0A6B8] hover:text-white focus:ring-[#30354A]',
  }[variant];

  return (
    <button
      className={base + ' ' + sizeStyles + ' ' + variantStyles + ' ' + className}
      disabled={disabled}
      {...props}
    >
      {icon && <span className='flex-shrink-0'>{icon}</span>}
      {children}
    </button>
  );
};
