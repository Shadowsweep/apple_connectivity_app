import React, { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { libraryApi } from '../../api/libraryApi';

export const BackendStatusModal: React.FC = () => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const checkHealth = async () => {
    try {
      const res = await libraryApi.getHealth();
      if (res && res.status === 'ok') {
        setIsHealthy(true);
        return true;
      }
    } catch {
      // Backend not healthy yet
    }
    setIsHealthy(false);
    return false;
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(() => {
      checkHealth();
    }, 4000);
    return () => clearInterval(interval);
  }, [retryCount]);

  const handleRestart = async () => {
    setIsRetrying(true);
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('restart_backend');
      } catch (e) {
        console.error('Tauri restart failed', e);
      }
    }
    await checkHealth();
    setIsRetrying(false);
    setRetryCount((c) => c + 1);
  };

  if (isHealthy === true || isHealthy === null) {
    return null;
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200'>
      <div className='max-w-md w-full bg-[#12141C] border border-[#FF3B30]/30 rounded-3xl p-6 shadow-2xl space-y-5 text-center'>
        <div className='w-14 h-14 rounded-2xl bg-[#FF3B30]/15 text-[#FF3B30] flex items-center justify-center mx-auto border border-[#FF3B30]/20'>
          <AlertCircle className='w-7 h-7' />
        </div>

        <div className='space-y-2'>
          <h3 className='text-lg font-bold text-white'>MEMEASY Service Offline</h3>
          <p className='text-xs text-[#A0A6B8] leading-relaxed'>
            The local FastAPI media service is not responding. The sidecar process may be starting up or was terminated.
          </p>
        </div>

        <div className='p-3 bg-[#1A1D28] rounded-xl border border-[#232736] text-[11px] font-mono text-[#6B7280]'>
          Target: 127.0.0.1 (Localhost Sidecar)
        </div>

        <div className='flex justify-center gap-3 pt-2'>
          <Button
            variant='primary'
            icon={<RefreshCw className={'w-4 h-4 ' + (isRetrying ? 'animate-spin' : '')} />}
            disabled={isRetrying}
            onClick={handleRestart}
          >
            {isRetrying ? 'Reconnecting...' : 'Restart Backend'}
          </Button>
        </div>
      </div>
    </div>
  );
};
