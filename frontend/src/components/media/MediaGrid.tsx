import React, { useMemo } from 'react';
import { MediaRecord } from '../../types/media';
import { MediaCard } from './MediaCard';
import { Image as ImageIcon, Calendar } from '../icons';
import { formatMonthSection } from '../../utils/formatters';

interface MediaGridProps {
  items: MediaRecord[];
  favoriteIds?: Set<string>;
  onToggleFavorite?: (media: MediaRecord) => void;
  onSelectMedia?: (media: MediaRecord) => void;
  isLoading?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, selected: boolean) => void;
  showSelect?: boolean;
  groupByMonth?: boolean;
  onAddToAlbum?: (media: MediaRecord) => void;
  onAddToFolder?: (media: MediaRecord) => void;
}

interface MonthSection {
  label: string;
  items: MediaRecord[];
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
  groupByMonth = false,
  onAddToAlbum,
  onAddToFolder,
}) => {
  // Section items by month (capture date, falling back to import date)
  const sections: MonthSection[] = useMemo(() => {
    if (!groupByMonth) return [{ label: '', items }];
    const map = new Map<string, MediaRecord[]>();
    for (const media of items) {
      const label = formatMonthSection(media.capture_date ?? media.imported_at);
      const bucket = map.get(label);
      if (bucket) {
        bucket.push(media);
      } else {
        map.set(label, [media]);
      }
    }
    return Array.from(map, ([label, sectionItems]) => ({ label, items: sectionItems }));
  }, [groupByMonth, items]);

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
          Try clearing filters or import new photos &amp; videos from your iPhone or local storage.
        </p>
      </div>
    );
  }

  const gridClass = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3';

  return (
    <div className='space-y-6'>
      {sections.map((section) => (
        <div key={section.label || 'all'}>
          {groupByMonth && section.label && (
            <div className='flex items-center gap-2.5 mb-3 px-1 pt-2 border-b border-[#232736]/60 pb-2'>
              <Calendar className='w-4 h-4 text-(--mm-accent)' />
              <h3 className='text-sm font-bold text-white tracking-wide'>{section.label}</h3>
              <span className='px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#1A1D28] text-[#A0A6B8] border border-[#232736]'>
                {section.items.length} {section.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          )}
          <div className={gridClass}>
            {section.items.map((media) => (
              <MediaCard
                key={media.id}
                media={media}
                isFavorite={favoriteIds.has(media.id)}
                onToggleFavorite={() => onToggleFavorite?.(media)}
                onClick={() => onSelectMedia?.(media)}
                selected={selectedIds?.has(media.id)}
                onSelect={(selected) => onToggleSelect?.(media.id, selected)}
                showSelect={showSelect}
                onAddToAlbum={onAddToAlbum}
                onAddToFolder={onAddToFolder}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
