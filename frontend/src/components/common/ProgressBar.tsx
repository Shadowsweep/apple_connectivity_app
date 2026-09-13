import React from 'react';

interface ProgressBarProps {
  progress: number;
  height?: string;
  variant?: 'primary' | 'verified' | 'warning';
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 'h-2',
  variant = 'primary',
  showLabel = false,
}) => {
  const clamped = Math.min(100, Math.max(0, progress));
  
  const colors = {
    primary: 'bg-[#2E7CF6]',
    verified: 'bg-[#00D68F]',
    warning: 'bg-[#FFB300]',
  }[variant];

  return (
    <div className='w-full'>
      <div className={'w-full bg-[#1A1D28] rounded-full overflow-hidden ' + height + ' border border-[#232736]'}>
        <div
          className={colors + ' h-full transition-all duration-300 ease-out'}
          style={{ width: clamped + '%' }}
        />
      </div>
      {showLabel && (
        <div className='flex justify-between text-xs text-[#A0A6B8] mt-1'>
          <span>Progress</span>
          <span>{clamped.toFixed(0) + '%'}</span>
        </div>
      )}
    </div>
  );
};
