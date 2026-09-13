import React from 'react';
import { HardDrive, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ImportPreviewResponse } from '../../types/import';
import { formatBytes } from '../../utils/formatters';

interface PreviewStepProps {
  preview: ImportPreviewResponse | null;
  isLoading: boolean;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({ preview, isLoading }) => {
  if (isLoading) {
    return (
      <div className='p-8 bg-[#1A1D28] rounded-2xl border border-[#232736] animate-pulse space-y-4'>
        <div className='h-4 bg-[#232736] rounded w-1/4' />
        <div className='h-8 bg-[#232736] rounded w-3/4' />
      </div>
    );
  }

  if (!preview) return null;

  return (
    <div className='space-y-4'>
      <h3 className='text-sm font-semibold text-white'>3. Import Safety & Storage Preview</h3>

      <div className='bg-[#1A1D28] rounded-2xl p-6 border border-[#232736] space-y-6'>
        {/* Numbers grid */}
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
          <div className='p-4 bg-[#12141C] rounded-xl border border-[#232736]'>
            <span className='text-[11px] text-[#6B7280] block mb-1'>New Items</span>
            <span className='text-xl font-bold text-white'>{preview.new_items_count}</span>
          </div>
          <div className='p-4 bg-[#12141C] rounded-xl border border-[#232736]'>
            <span className='text-[11px] text-[#6B7280] block mb-1'>Duplicates Skipped</span>
            <span className='text-xl font-bold text-[#FFB300]'>{preview.already_imported_count}</span>
          </div>
          <div className='p-4 bg-[#12141C] rounded-xl border border-[#232736]'>
            <span className='text-[11px] text-[#6B7280] block mb-1'>Photos & Videos</span>
            <span className='text-xl font-bold text-[#2E7CF6]'>
              {preview.photos_count + preview.videos_count}
            </span>
          </div>
          <div className='p-4 bg-[#12141C] rounded-xl border border-[#232736]'>
            <span className='text-[11px] text-[#6B7280] block mb-1'>Required Space</span>
            <span className='text-xl font-bold text-white'>{preview.formatted_required}</span>
          </div>
        </div>

        {/* Safety Reserve Warning / Confirmation */}
        <div className={'p-4 rounded-xl border flex items-start gap-3 ' + (preview.can_fit ? 'bg-[#00D68F]/10 border-[#00D68F]/30 text-[#00D68F]' : 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30]')}>
          {preview.can_fit ? (
            <ShieldCheck className='w-5 h-5 flex-shrink-0 mt-0.5' />
          ) : (
            <AlertTriangle className='w-5 h-5 flex-shrink-0 mt-0.5' />
          )}
          <div className='text-xs space-y-1'>
            <p className='font-semibold'>
              {preview.can_fit
                ? 'Safe to Import: Destination disk has sufficient usable space.'
                : 'Insufficient Storage: Import would violate the 10 GB safety reserve!'}
            </p>
            <p className='text-[#A0A6B8]'>
              Available: {formatBytes(preview.available_bytes)} | Usable (Reserve Subtracted): {formatBytes(preview.usable_bytes)} | Safety Reserve: 10 GB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
