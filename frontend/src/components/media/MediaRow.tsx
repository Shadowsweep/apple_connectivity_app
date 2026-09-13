import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { MediaRecord } from '../../types/media';
import { MediaCard } from './MediaCard';

interface MediaRowProps {
  title: string;
  items: MediaRecord[];
  favoriteIds?: Set<string>;
  onToggleFavorite?: (media: MediaRecord) => void;
  onSelectMedia: (media: MediaRecord) => void;
  onSeeAll?: () => void;
  icon?: React.ReactNode;
}

export const MediaRow: React.FC<MediaRowProps> = ({
  title,
  items,
  favoriteIds = new Set(),
  onToggleFavorite,
  onSelectMedia,
  onSeeAll,
  icon,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const offset = direction === 'left' ? -500 : 500;
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  if (!items || items.length === 0) return null;

  return (
    <div className='space-y-3 group/row relative'>
      {/* Header Row */}
      <div className='flex items-center justify-between px-1'>
        <h3 className='text-base font-bold text-white flex items-center gap-2'>
          {icon && <span className='text-[#2E7CF6]'>{icon}</span>}
          {title}
        </h3>

        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className='text-xs font-semibold text-[#A0A6B8] hover:text-[#2E7CF6] flex items-center gap-1 transition-colors'
          >
            See All <ArrowRight className='w-3.5 h-3.5' />
          </button>
        )}
      </div>

      {/* Horizontal Reel Container */}
      <div className='relative'>
        {/* Left Scroll Chevron */}
        <button
          onClick={() => scroll('left')}
          className='absolute left-0 top-1/2 -translate-y-1/2 z-20 w-9 h-16 bg-black/75 hover:bg-black/95 text-white flex items-center justify-center rounded-r-xl opacity-0 group-hover/row:opacity-100 transition-opacity backdrop-blur-sm'
        >
          <ChevronLeft className='w-5 h-5' />
        </button>

        {/* Scrollable track */}
        <div
          ref={scrollRef}
          className='flex items-center gap-3.5 overflow-x-auto scrollbar-none py-1 px-1 scroll-smooth'
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((media) => (
            <div key={media.id} className='w-48 flex-shrink-0'>
              <MediaCard
                media={media}
                isFavorite={favoriteIds.has(media.id)}
                onToggleFavorite={() => onToggleFavorite?.(media)}
                onClick={() => onSelectMedia(media)}
              />
            </div>
          ))}
        </div>

        {/* Right Scroll Chevron */}
        <button
          onClick={() => scroll('right')}
          className='absolute right-0 top-1/2 -translate-y-1/2 z-20 w-9 h-16 bg-black/75 hover:bg-black/95 text-white flex items-center justify-center rounded-l-xl opacity-0 group-hover/row:opacity-100 transition-opacity backdrop-blur-sm'
        >
          <ChevronRight className='w-5 h-5' />
        </button>
      </div>
    </div>
  );
};
