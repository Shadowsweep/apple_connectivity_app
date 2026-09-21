import React from 'react';
import { Smartphone, Image, Video, Sparkles, Copy, AlertCircle, RefreshCw } from '../icons';
import { DeviceSummary } from '../../api/importApi';
import { Button } from '../common/Button';

interface DeviceSummaryPanelProps {
  summary: DeviceSummary | null;
  isLoading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const SkeletonTile: React.FC = () => (
  <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736] space-y-2 animate-pulse'>
    <div className='h-3 w-3/5 bg-[#232736] rounded' />
    <div className='h-5 w-2/5 bg-[#232736] rounded' />
  </div>
);

export const DeviceSummaryPanel: React.FC<DeviceSummaryPanelProps> = ({
  summary,
  isLoading,
  onRefresh,
  isRefreshing,
}) => {
  if (isLoading) {
    return (
      <div className='bg-[#1A1D28] rounded-2xl p-5 border border-[#232736] space-y-4'>
        <div className='flex items-center gap-3 animate-pulse'>
          <div className='w-10 h-10 rounded-xl bg-[#232736]' />
          <div className='space-y-2'>
            <div className='h-3.5 w-40 bg-[#232736] rounded' />
            <div className='h-2.5 w-56 bg-[#232736] rounded' />
          </div>
        </div>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
          <SkeletonTile />
          <SkeletonTile />
          <SkeletonTile />
          <SkeletonTile />
        </div>
        <div className='h-2 w-full bg-[#12141C] rounded-full animate-pulse' />
        <p className='text-[11px] text-[#6B7280] flex items-center gap-2'>
          <RefreshCw className='w-3 h-3 animate-spin' /> Reading device media index over USB...
        </p>
      </div>
    );
  }

  if (!summary || !summary.is_connected || summary.connection_status !== 'READY') {
    const title =
      summary?.connection_status === 'LOCKED' ? 'iPhone is locked'
      : summary?.connection_status === 'UNTRUSTED' ? 'Tap Trust on the iPhone'
      : summary?.connection_status === 'EMPTY' || summary?.connection_status === 'NEEDS_ATTENTION' ? 'iPhone connected — access needed'
      : summary?.is_connected ? 'iPhone connected — access needed'
      : 'No device detected';
    return (
      <div className='bg-[#1A1D28] rounded-2xl p-6 border border-[#FFB300]/30 flex items-start gap-3'>
        <AlertCircle className='w-5 h-5 text-[#FFB300] flex-shrink-0 mt-0.5' />
        <div className='space-y-1'>
          <h4 className='text-sm font-semibold text-white'>
            {title}
          </h4>
          <p className='text-xs text-[#A0A6B8]'>
            {summary?.message || (
              <>Connect your iPhone with a USB cable and tap <span className='text-white'>Trust This Computer</span> on the
              phone, then refresh. Make sure the Apple Devices app is installed on this PC.</>
            )}
          </p>
          {summary?.action && <p className='text-xs text-white'>Next: {summary.action}</p>}
          {summary?.provider && <p className='text-[11px] text-[#6B7280]'>Reader: {summary.provider}</p>}
          <Button
            variant='secondary'
            size='sm'
            icon={<RefreshCw className={'w-3.5 h-3.5 ' + (isRefreshing ? 'animate-spin' : '')} />}
            disabled={isRefreshing}
            onClick={onRefresh}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const tiles = [
    { label: 'Photos', value: summary.photos_count, icon: <Image className='w-4 h-4 text-(--mm-accent)' /> },
    { label: 'Videos', value: summary.videos_count, icon: <Video className='w-4 h-4 text-(--mm-accent)' /> },
    { label: 'Screenshots', value: summary.screenshots_count, icon: <Copy className='w-4 h-4 text-[#FFB300]' /> },
    { label: 'Live Photos', value: summary.live_photos_count, icon: <Sparkles className='w-4 h-4 text-[#00D68F]' /> },
  ];

  return (
    <div className='bg-[#1A1D28] rounded-2xl p-5 border border-[#232736] space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='p-2.5 rounded-xl bg-[#00D68F]/15 text-[#00D68F] border border-[#00D68F]/20'>
            <Smartphone className='w-5 h-5' />
          </div>
          <div>
            <h4 className='text-sm font-semibold text-white flex items-center gap-2'>
              {summary.device_name}
              {summary.is_real_device ? (
                <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00D68F]/15 text-[#00D68F] border border-[#00D68F]/30'>
                  USB Connected
                </span>
              ) : (
                <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFB300]/15 text-[#FFB300] border border-[#FFB300]/30'>
                  Demo Data
                </span>
              )}
            </h4>
            <p className='text-xs text-[#A0A6B8]'>
              {summary.total_count.toLocaleString()} items · {summary.formatted_total} on device
              {summary.oldest_capture_date && summary.newest_capture_date && (
                <> · {summary.oldest_capture_date.slice(0, 10)} → {summary.newest_capture_date.slice(0, 10)}</>
              )}
            </p>
          </div>
        </div>

        <Button
          variant='ghost'
          size='sm'
          icon={<RefreshCw className={'w-3.5 h-3.5 ' + (isRefreshing ? 'animate-spin' : '')} />}
          disabled={isRefreshing}
          onClick={onRefresh}
        >
          Rescan
        </Button>
      </div>

      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        {tiles.map(({ label, value, icon }) => (
          <div key={label} className='p-3 bg-[#12141C] rounded-xl border border-[#232736]'>
            <span className='text-[#6B7280] text-[11px] flex items-center gap-1.5 mb-1'>
              {icon} {label}
            </span>
            <span className='text-white font-bold text-lg'>{value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
