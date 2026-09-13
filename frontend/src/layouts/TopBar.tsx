import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '../components/common/Button';

interface TopBarProps {
  title?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title }) => {
  const navigate = useNavigate();

  return (
    <header className='h-16 border-b border-[#232736] px-8 flex items-center justify-between bg-[#090A0F]/80 backdrop-blur-md sticky top-0 z-30'>
      <div className='flex items-center gap-3'>
        <h2 className='text-lg font-semibold text-white tracking-tight'>
          {title || 'Media Vault'}
        </h2>
      </div>

      <div className='flex items-center gap-3'>
        <Button
          variant='secondary'
          size='sm'
          icon={<Sparkles className='w-3.5 h-3.5 text-[#00D68F]' />}
          onClick={() => navigate('/clean')}
        >
          Clean Mobile
        </Button>

        <Button
          variant='primary'
          size='sm'
          icon={<Download className='w-3.5 h-3.5' />}
          onClick={() => navigate('/import')}
        >
          Import iPhone
        </Button>
      </div>
    </header>
  );
};
