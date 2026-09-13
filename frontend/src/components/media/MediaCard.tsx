import React, { useState } from 'react';
import { Star, Play, Layers } from 'lucide-react';
import { MediaRecord } from '../../types/media';
import { mediaApi } from '../../api/mediaApi';
import { formatDuration } from '../../utils/formatters';
import { ContextMenu } from '../common/ContextMenu';

interface MediaCardProps {
  media: MediaRecord;
  isFavorite?: boolean;
  onToggleFavorite?: (e?: React.MouseEvent) => void;
  onClick?: () => void;
  onSelect?: (selected: boolean) => void;
  selected?: boolean;
  showSelect?: boolean;
  onAddToAlbum?: (media: MediaRecord) => void;
  onDelete?: (media: MediaRecord) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  media,
  isFavorite = false,
  onToggleFavorite,
  onClick,
  onSelect,
  selected = false,
  showSelect = false,
  onAddToAlbum,
  onDelete,
}) => {
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const thumbUrl = mediaApi.getThumbnailUrl(media.id);
  const isVideo = media.media_type === 'VIDEO';
  const isLivePhoto = media.media_type === 'LIVE_PHOTO';

  const borderClass = selected
    ? 'border-[#2E7CF6] ring-2 ring-[#2E7CF6]'
    : 'border-[#232736] hover:border-[#2E7CF6]/50 hover:scale-[1.02]';

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className={'group relative aspect-square bg-[#1A1D28] rounded-2xl overflow-hidden cursor-pointer border transition-all duration-200 shadow-md ' + borderClass}
      >
        <img
          src={thumbUrl}
          alt={media.filename}
          loading='lazy'
          className='w-full h-full object-cover transition-transform duration-300 group-hover:scale-105'
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />

        {/* Top Badges & Favorite Toggle */}
        <div className='absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none'>
          <div className='flex items-center gap-1.5'>
            {isVideo && (
              <span className='px-2 py-0.5 rounded-md text-[11px] font-semibold bg-black/75 backdrop-blur-md text-white flex items-center gap-1'>
                <Play className='w-3 h-3 fill-white' />
                {formatDuration(media.duration_ms)}
              </span>
            )}
            {isLivePhoto && (
              <span className='px-2 py-0.5 rounded-md text-[11px] font-semibold bg-black/75 backdrop-blur-md text-[#2E7CF6] flex items-center gap-1'>
                <Layers className='w-3 h-3' />
                LIVE
              </span>
            )}
          </div>

          {onToggleFavorite && (
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(e);
              }}
              className={'pointer-events-auto p-1.5 rounded-full backdrop-blur-md transition-all ' + (isFavorite ? 'bg-[#FFB300] text-black shadow-lg' : 'bg-black/50 text-white/70 hover:text-white hover:bg-black/80 opacity-0 group-hover:opacity-100')}
            >
              <Star className={'w-3.5 h-3.5 ' + (isFavorite ? 'fill-black' : '')} />
            </button>
          )}
        </div>

        {/* Multi-select check */}
        {showSelect && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(!selected);
            }}
            className={'absolute bottom-2 left-2 p-1 rounded-md backdrop-blur-md cursor-pointer transition-all ' + (selected ? 'bg-[#2E7CF6] text-white' : 'bg-black/50 text-white/70 hover:bg-black/80 opacity-0 group-hover:opacity-100')}
          >
            <input
              type='checkbox'
              checked={selected}
              onChange={() => {}}
              className='w-4 h-4 rounded border-gray-400 text-[#2E7CF6] focus:ring-0 cursor-pointer'
            />
          </div>
        )}

        {/* Title gradient vignette on hover */}
        <div className='absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end'>
          <p className='text-xs font-semibold text-white truncate'>{media.filename}</p>
        </div>
      </div>

      {/* Desktop Context Menu */}
      {contextMenuPos && (
        <ContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          media={media}
          isFavorite={isFavorite}
          onClose={() => setContextMenuPos(null)}
          onOpen={() => onClick?.()}
          onToggleFavorite={() => onToggleFavorite?.()}
          onAddToAlbum={() => onAddToAlbum?.(media)}
          onDelete={onDelete}
        />
      )}
    </>
  );
};
