import React, { useState } from 'react';
import { Smartphone, Folder, CheckCircle, FolderOpen } from '../icons';
import { FolderBrowserModal } from '../common/FolderBrowserModal';
import type { DeviceSummary } from '../../api/importApi';

interface DeviceSelectorProps {
  deviceType: 'iphone' | 'local';
  onSelectDeviceType: (type: 'iphone' | 'local') => void;
  customPath: string;
  onCustomPathChange: (path: string) => void;
  deviceSummary?: DeviceSummary | null;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  deviceType,
  onSelectDeviceType,
  customPath,
  onCustomPathChange,
  deviceSummary,
}) => {
  const [browserOpen, setBrowserOpen] = useState(false);

  return (
    <div className='space-y-4'>
      <h3 className='text-sm font-semibold text-white'>1. Select Media Source</h3>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* iPhone / USB device — real connection status */}
        <div
          onClick={() => onSelectDeviceType('iphone')}
          className={'p-5 rounded-2xl border cursor-pointer transition-all ' + (deviceType === 'iphone' ? 'bg-(--mm-accent)/10 border-(--mm-accent) ring-1 ring-(--mm-accent)' : 'bg-[#1A1D28] border-[#232736] hover:border-[#30354A]')}
        >
          <div className='flex items-start justify-between mb-3'>
            <div
              className={
                'p-3 rounded-xl bg-[#12141C] border border-[#232736] ' +
                (deviceSummary?.is_connected ? 'text-[#00D68F]' : 'text-[#6B7280]')
              }
            >
              <Smartphone className='w-6 h-6' />
            </div>
            {deviceType === 'iphone' && <CheckCircle className='w-5 h-5 text-(--mm-accent)' />}
          </div>
          <h4 className='text-sm font-semibold text-white mb-1'>
            {deviceSummary?.is_connected ? deviceSummary.device_name : 'iPhone (USB)'}
          </h4>
          <p className='text-xs text-[#A0A6B8]'>
            {deviceSummary?.connection_status === 'READY'
              ? `Ready through ${deviceSummary.provider || 'Apple Devices'}.`
              : deviceSummary?.message || 'Connect your iPhone via USB, unlock it, and tap Trust This Computer.'}
          </p>
        </div>

        {/* Local Directory */}
        <div
          onClick={() => onSelectDeviceType('local')}
          className={'p-5 rounded-2xl border cursor-pointer transition-all ' + (deviceType === 'local' ? 'bg-(--mm-accent)/10 border-(--mm-accent) ring-1 ring-(--mm-accent)' : 'bg-[#1A1D28] border-[#232736] hover:border-[#30354A]')}
        >
          <div className='flex items-start justify-between mb-3'>
            <div className='p-3 rounded-xl bg-[#12141C] text-[#FFB300] border border-[#232736]'>
              <Folder className='w-6 h-6' />
            </div>
            {deviceType === 'local' && <CheckCircle className='w-5 h-5 text-(--mm-accent)' />}
          </div>
          <h4 className='text-sm font-semibold text-white mb-1'>Custom Local Folder</h4>
          <p className='text-xs text-[#A0A6B8]'>
            Import and organize media from an external SSD, SD card, or local Windows directory.
          </p>
        </div>
      </div>

      {deviceType === 'local' && (
        <div className='pt-2'>
          <label className='block text-xs font-medium text-[#A0A6B8] mb-1.5'>
            Local Folder Path
          </label>
          <div className='flex gap-2'>
            <input
              type='text'
              value={customPath}
              onChange={(e) => onCustomPathChange(e.target.value)}
              placeholder='D:\Photos\2025_iPhone_Backup'
              className='flex-1 px-3.5 py-2 rounded-xl bg-[#12141C] border border-[#232736] text-white text-xs font-mono focus:outline-none focus:border-(--mm-accent)'
            />
            <button
              onClick={() => setBrowserOpen(true)}
              className='flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1A1D28] border border-[#232736] text-xs font-medium text-[#A0A6B8] hover:text-white hover:border-(--mm-accent)/50 transition-all flex-shrink-0'
            >
              <FolderOpen className='w-3.5 h-3.5 text-(--mm-accent)' /> Browse
            </button>
          </div>
        </div>
      )}

      <FolderBrowserModal
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onSelect={onCustomPathChange}
      />
    </div>
  );
};
