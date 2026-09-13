import React from 'react';
import { Smartphone, Folder, CheckCircle } from 'lucide-react';

interface DeviceSelectorProps {
  deviceType: 'iphone' | 'local';
  onSelectDeviceType: (type: 'iphone' | 'local') => void;
  customPath: string;
  onCustomPathChange: (path: string) => void;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  deviceType,
  onSelectDeviceType,
  customPath,
  onCustomPathChange,
}) => {
  return (
    <div className='space-y-4'>
      <h3 className='text-sm font-semibold text-white'>1. Select Media Source</h3>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* iPhone / Mock iPhone */}
        <div
          onClick={() => onSelectDeviceType('iphone')}
          className={'p-5 rounded-2xl border cursor-pointer transition-all ' + (deviceType === 'iphone' ? 'bg-[#2E7CF6]/10 border-[#2E7CF6] ring-1 ring-[#2E7CF6]' : 'bg-[#1A1D28] border-[#232736] hover:border-[#30354A]')}
        >
          <div className='flex items-start justify-between mb-3'>
            <div className='p-3 rounded-xl bg-[#12141C] text-[#2E7CF6] border border-[#232736]'>
              <Smartphone className='w-6 h-6' />
            </div>
            {deviceType === 'iphone' && <CheckCircle className='w-5 h-5 text-[#2E7CF6]' />}
          </div>
          <h4 className='text-sm font-semibold text-white mb-1'>iPhone (USB Connected)</h4>
          <p className='text-xs text-[#A0A6B8]'>
            Scans photos, 4K/HDR videos, and Live Photos directly from connected iPhone or Mock Device.
          </p>
        </div>

        {/* Local Directory */}
        <div
          onClick={() => onSelectDeviceType('local')}
          className={'p-5 rounded-2xl border cursor-pointer transition-all ' + (deviceType === 'local' ? 'bg-[#2E7CF6]/10 border-[#2E7CF6] ring-1 ring-[#2E7CF6]' : 'bg-[#1A1D28] border-[#232736] hover:border-[#30354A]')}
        >
          <div className='flex items-start justify-between mb-3'>
            <div className='p-3 rounded-xl bg-[#12141C] text-[#FFB300] border border-[#232736]'>
              <Folder className='w-6 h-6' />
            </div>
            {deviceType === 'local' && <CheckCircle className='w-5 h-5 text-[#2E7CF6]' />}
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
          <input
            type='text'
            value={customPath}
            onChange={(e) => onCustomPathChange(e.target.value)}
            placeholder='D:\Photos\2025_iPhone_Backup'
            className='w-full px-3.5 py-2 rounded-xl bg-[#12141C] border border-[#232736] text-white text-xs font-mono focus:outline-none focus:border-[#2E7CF6]'
          />
        </div>
      )}
    </div>
  );
};
