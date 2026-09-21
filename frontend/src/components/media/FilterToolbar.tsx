import React from 'react';
import { Search, Grid, Image, Video, Layers, SlidersHorizontal } from '../icons';
import { MediaType } from '../../types/media';

interface FilterToolbarProps {
  currentType: MediaType | 'ALL';
  onTypeChange: (type: MediaType | 'ALL') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalCount?: number;
  onOpenAdvancedFilters?: () => void;
  activeFilterCount?: number;
  currentSort?: string;
  onSortChange?: (sort: string) => void;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  currentType,
  onTypeChange,
  searchQuery,
  onSearchChange,
  totalCount,
  onOpenAdvancedFilters,
  activeFilterCount = 0,
  currentSort = 'newest',
  onSortChange,
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
            className={'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ' + (currentType === key ? 'bg-(--mm-accent) text-white shadow' : 'text-[#A0A6B8] hover:text-white hover:bg-[#1A1D28]')}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <div className='flex items-center gap-3 flex-1 max-w-md justify-end'>
        <div className='relative flex-1 max-w-xs'>
          <Search className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]' />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder='Search filename...'
            className='w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[#12141C] border border-[#232736] text-white placeholder-[#6B7280] focus:outline-none focus:border-(--mm-accent)'
          />
        </div>

        {onOpenAdvancedFilters && (
          <button
            type='button'
            onClick={onOpenAdvancedFilters}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeFilterCount > 0
                ? 'bg-(--mm-accent) text-white border-(--mm-accent)'
                : 'bg-[#12141C] text-[#A0A6B8] hover:text-white border-[#232736]'
            }`}
          >
            <SlidersHorizontal className='w-3.5 h-3.5' />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className='w-4 h-4 rounded-full bg-white text-(--mm-accent) text-[10px] flex items-center justify-center font-bold'>
                {activeFilterCount}
              </span>
            )}
          </button>
        )}

        {onSortChange && (
          <select
            value={currentSort}
            onChange={(e) => onSortChange(e.target.value)}
            className='bg-[#12141C] text-[#A0A6B8] hover:text-white border border-[#232736] rounded-xl px-2.5 py-1.5 text-xs font-medium outline-none focus:border-(--mm-accent) transition-all cursor-pointer'
            title='Sort media items'
          >
            <option value='newest'>Newest First</option>
            <option value='oldest'>Oldest First</option>
            <option value='imported_newest'>Recently Imported</option>
            <option value='size_desc'>Largest Files</option>
            <option value='name_asc'>Name (A-Z)</option>
          </select>
        )}

        {totalCount !== undefined && (
          <span className='text-xs text-[#6B7280] whitespace-nowrap'>{totalCount.toLocaleString()} items</span>
        )}
      </div>
    </div>
  );
};

