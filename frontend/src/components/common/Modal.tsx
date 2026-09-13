import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-xl',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm'>
      <div className={'relative w-full ' + maxWidth + ' bg-[#12141C] border border-[#232736] rounded-2xl shadow-2xl overflow-hidden'}>
        {title && (
          <div className='flex items-center justify-between px-6 py-4 border-b border-[#232736]'>
            <h3 className='text-lg font-semibold text-white'>{title}</h3>
            <button
              onClick={onClose}
              className='p-1.5 text-[#A0A6B8] hover:text-white rounded-lg hover:bg-[#1A1D28] transition-colors'
            >
              <X className='w-5 h-5' />
            </button>
          </div>
        )}
        <div className='p-6 max-h-[85vh] overflow-y-auto'>{children}</div>
      </div>
    </div>
  );
};
