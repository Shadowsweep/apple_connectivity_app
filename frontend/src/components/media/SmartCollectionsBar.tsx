import React from 'react';
import { Sparkles, Star, Film, HardDrive, Clock, Calendar, Bookmark, X } from 'lucide-react';
import { MediaFilters } from '../../types/filters';
import { useSavedSearches, useDeleteSavedSearch } from '../../hooks/useSavedSearches';

interface SmartCollectionsBarProps {
  activeFilters: MediaFilters;
  onSelectFilters: (filters: MediaFilters) => void;
}

export const SmartCollectionsBar: React.FC<SmartCollectionsBarProps> = ({
  activeFilters,
  onSelectFilters,
}) => {
  const { data: savedSearches } = useSavedSearches();
  const deleteSearchMutation = useDeleteSavedSearch();

  const presets: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    query: MediaFilters;
  }> = [
    {
      id: 'favorites',
      label: 'Favorites',
      icon: <Star className='w-3 h-3 text-[#FFB300] fill-[#FFB300]' />,
      query: { favorite: true, sort: 'newest' },
    },
    {
      id: '4k_videos',
      label: '4K Videos',
      icon: <Film className='w-3 h-3 text-[#2E7CF6]' />,
      query: { mediaType: 'VIDEO', minWidth: 3840, sort: 'newest' },
    },
    {
      id: 'large_videos',
      label: 'Large Videos (>1GB)',
      icon: <HardDrive className='w-3 h-3 text-[#00D68F]' />,
      query: { mediaType: 'VIDEO', minSize: 1024 * 1024 * 1024, sort: 'size_desc' },
    },
    {
      id: 'long_videos',
      label: 'Long Clips (>5m)',
      icon: <Clock className='w-3 h-3 text-purple-400' />,
      query: { mediaType: 'VIDEO', minDuration: 300000, sort: 'duration_desc' },
    },
    {
      id: 'old_photos',
      label: 'Old Photos (<2020)',
      icon: <Calendar className='w-3 h-3 text-amber-400' />,
      query: { mediaType: 'PHOTO', endDate: '2020-01-01', sort: 'oldest' },
    },
  ];

  return (
    <div className='flex items-center gap-2 overflow-x-auto scrollbar-none py-1'>
      <span className='text-[11px] font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-1 flex-shrink-0'>
        <Sparkles className='w-3 h-3 text-[#2E7CF6]' /> Smart:
      </span>

      {presets.map((preset) => (
        <button
          key={preset.id}
          type='button'
          onClick={() => onSelectFilters(preset.query)}
          className='px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1A1D28]/60 hover:bg-[#1A1D28] border border-[#232736] text-[#A0A6B8] hover:text-white flex items-center gap-1.5 flex-shrink-0 transition-colors shadow-sm'
        >
          {preset.icon}
          <span>{preset.label}</span>
        </button>
      ))}

      {/* User Saved Searches */}
      {savedSearches && savedSearches.length > 0 && (
        <>
          <div className='h-4 w-[1px] bg-[#232736] mx-1 flex-shrink-0' />
          {savedSearches.map((s) => (
            <div
              key={s.id}
              className='group flex items-center rounded-xl bg-[#2E7CF6]/10 border border-[#2E7CF6]/30 text-xs text-[#2E7CF6] font-semibold flex-shrink-0'
            >
              <button
                type='button'
                onClick={() => onSelectFilters(s.query)}
                className='px-2.5 py-1.5 flex items-center gap-1.5 hover:text-white transition-colors'
              >
                <Bookmark className='w-3 h-3' />
                <span>{s.name}</span>
              </button>
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSearchMutation.mutate(s.id);
                }}
                className='p-1 pr-2 text-[#2E7CF6]/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity'
              >
                <X className='w-3 h-3' />
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
