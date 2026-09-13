import React from 'react';
import { MediaRecord } from '../../types/media';
import { MediaCard } from './MediaCard';
import { Image as ImageIcon } from 'lucide-react';

interface MediaGridProps {
  items: MediaRecord[];
  favoriteIds?: Set<string>;
  onToggleFavorite?: (media: MediaRecord) => void;
  onSelectMedia?: (media: MediaRecord) => void;
  isLoading?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, selected: boolean) => void;
  showSelect?: boolean;
}

export const MediaGrid: React.FC<MediaGridProps> = ({
  items,
  favoriteIds = new Set(),
  onToggleFavorite,
  onSelectMedia,
  isLoading = false,
  selectedIds,
  onToggleSelect,
  showSelect = false,
}) => {
  if (isLoading) {
    return (
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'>
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className='aspect-square bg-[#1A1D28] rounded-xl animate-pulse border border-[#232736]'
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-20 text-center'>
        <div className='w-16 h-16 rounded-full bg-[#1A1D28] flex items-center justify-center mb-4 border border-[#232736]'>
          <ImageIcon className='w-8 h-8 text-[#6B7280]' />
        </div>
        <h3 className='text-base font-medium text-white mb-1'>No media items found</h3>
        <p className='text-xs text-[#A0A6B8] max-w-sm'>
          Try clearing filters or import new photos & videos from your iPhone or local storage.
        </p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'>
      {items.map((media) => (
        <MediaCard
          key={media.id}
          media={media}
          isFavorite={favoriteIds.has(media.id)}
          onToggleFavorite={() => onToggleFavorite?.(media)}
          onClick={() => onSelectMedia?.(media)}
          selected={selectedIds?.has(media.id)}
          onSelect={(selected) => onToggleSelect?.(media.id, selected)}
          showSelect={showSelect}
        />
      ))}
    </div>
  );
};
