import React from 'react';
import { Search, Grid, Image, Video, Layers } from 'lucide-react';
import { MediaType } from '../../types/media';

interface FilterToolbarProps {
  currentType: MediaType | 'ALL';
  onTypeChange: (type: MediaType | 'ALL') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalCount?: number;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  currentType,
  onTypeChange,
  searchQuery,
  onSearchChange,
  totalCount,
}) => {
  const types: { key: MediaType | 'ALL'; label: string; icon: React.ReactNode }[] = [
    { key: 'ALL', label: 'All Media', icon: <Grid className='w-4 h-4' /> },
    { key: 'PHOTO', label: 'Photos', icon: <Image className='w-4 h-4' /> },
    { key: 'VIDEO', label: 'Videos', icon: <Video className='w-4 h-4' /> },
    { key: 'LIVE_PHOTO', label: 'Live Photos', icon: <Layers className='w-4 h-4' /> },
  ];

  return (
    <div className='flex flex-wrap items-center justify-between gap-4 py-3 border-b border-[#232736]'>
      <div className='flex items-center gap-1.5 bg-[#12141C] p-1 rounded-xl border border-[#232736]'>
        {types.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => onTypeChange(key)}
            className={'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ' + (currentType === key ? 'bg-[#2E7CF6] text-white shadow' : 'text-[#A0A6B8] hover:text-white hover:bg-[#1A1D28]')}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <div className='flex items-center gap-3 flex-1 max-w-xs'>
        <div className='relative w-full'>
          <Search className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]' />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder='Search filename...'
            className='w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[#12141C] border border-[#232736] text-white placeholder-[#6B7280] focus:outline-none focus:border-[#2E7CF6]'
          />
        </div>
        {totalCount !== undefined && (
          <span className='text-xs text-[#6B7280] whitespace-nowrap'>{totalCount} items</span>
        )}
      </div>
    </div>
  );
};
