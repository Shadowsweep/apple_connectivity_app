import React, { useEffect, useRef } from 'react';
import { Eye, Star, FolderPlus, Trash2, Info, Play } from '../icons';
import { MediaRecord } from '../../types/media';

export interface ContextMenuProps {
  x: number;
  y: number;
  media: MediaRecord;
  isFavorite: boolean;
  onClose: () => void;
  onOpen: (media: MediaRecord) => void;
  onToggleFavorite: (media: MediaRecord) => void;
  onAddToAlbum: (media: MediaRecord) => void;
  onAddToFolder?: (media: MediaRecord) => void;
  onViewDetails?: (media: MediaRecord) => void;
  onDelete?: (media: MediaRecord) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  media,
  isFavorite,
  onClose,
  onOpen,
  onToggleFavorite,
  onAddToAlbum,
  onAddToFolder,
  onViewDetails,
  onDelete,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const isVideo = media.media_type === 'VIDEO';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust coordinates to ensure menu stays within screen
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const menuW = 180;
  const menuH = 200;
  const adjustedX = x + menuW > screenW ? screenW - menuW - 10 : x;
  const adjustedY = y + menuH > screenH ? screenH - menuH - 10 : y;

  return (
    <div
      ref={menuRef}
      style={{ top: adjustedY + 'px', left: adjustedX + 'px' }}
      className='fixed z-50 w-48 bg-[#12141C] border border-[#232736] rounded-2xl shadow-2xl p-1.5 space-y-0.5 text-xs select-none animate-in fade-in duration-100'
    >
      <button
        onClick={() => {
          onOpen(media);
          onClose();
        }}
        className='w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white hover:bg-[#1A1D28] transition-colors text-left font-medium'
      >
        {isVideo ? <Play className='w-4 h-4 text-(--mm-accent)' /> : <Eye className='w-4 h-4 text-(--mm-accent)' />}
        {isVideo ? 'Play Video' : 'Open Photo'}
      </button>

      <button
        onClick={() => {
          onToggleFavorite(media);
          onClose();
        }}
        className='w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white hover:bg-[#1A1D28] transition-colors text-left'
      >
        <Star className={'w-4 h-4 ' + (isFavorite ? 'text-[#FFB300] fill-[#FFB300]' : 'text-[#6B7280]')} />
        {isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
      </button>

      {onAddToFolder && (
        <button
          onClick={() => {
            onAddToFolder(media);
            onClose();
          }}
          className='w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white hover:bg-[#1A1D28] transition-colors text-left'
        >
          <FolderPlus className='w-4 h-4 text-(--mm-accent)' />
          Add to Vault Folder...
        </button>
      )}

      <button
        onClick={() => {
          onAddToAlbum(media);
          onClose();
        }}
        className='w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white hover:bg-[#1A1D28] transition-colors text-left'
      >
        <FolderPlus className='w-4 h-4 text-[#A0A6B8]' />
        Add to Album...
      </button>

      {onViewDetails && (
        <button
          onClick={() => {
            onViewDetails(media);
            onClose();
          }}
          className='w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white hover:bg-[#1A1D28] transition-colors text-left'
        >
          <Info className='w-4 h-4 text-[#A0A6B8]' />
          View Details
        </button>
      )}

      {onDelete && (
        <div className='pt-1 mt-1 border-t border-[#232736]'>
          <button
            onClick={() => {
              onDelete(media);
              onClose();
            }}
            className='w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors text-left'
          >
            <Trash2 className='w-4 h-4' />
            Move to Trash
          </button>
        </div>
      )}
    </div>
  );
};
