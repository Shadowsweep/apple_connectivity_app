import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Star, Calendar, HardDrive, Hash, Maximize2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from '../icons';
import { MediaRecord } from '../../types/media';
import { mediaApi } from '../../api/mediaApi';
import { VideoPlayer } from '../player/VideoPlayer';
import { formatBytes, formatDate } from '../../utils/formatters';

interface MediaViewerProps {
  media: MediaRecord | null;
  itemsList?: MediaRecord[];
  isOpen: boolean;
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onNavigate?: (media: MediaRecord) => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  media,
  itemsList = [],
  isOpen,
  onClose,
  isFavorite = false,
  onToggleFavorite,
  onNavigate,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  // Find index in current filtered collection
  const currentIndex = media ? itemsList.findIndex((m) => m.id === media.id) : -1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < itemsList.length - 1;

  const navigatePrev = useCallback(() => {
    if (hasPrevious && onNavigate) {
      setIsZoomed(false);
      onNavigate(itemsList[currentIndex - 1]);
    }
  }, [hasPrevious, currentIndex, itemsList, onNavigate]);

  const navigateNext = useCallback(() => {
    if (hasNext && onNavigate) {
      setIsZoomed(false);
      onNavigate(itemsList[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, itemsList, onNavigate]);

  // Keyboard navigation (skip Escape while in fullscreen — browser exits fullscreen first)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) return;
        onClose();
      } else if (e.key === 'ArrowLeft') {
        navigatePrev();
      } else if (e.key === 'ArrowRight') {
        navigateNext();
      } else if (e.key === 'f' || e.key === 'F') {
        onToggleFavorite?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, navigatePrev, navigateNext, onToggleFavorite]);

  // Browser Back closes the viewer instead of navigating away
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ mmOverlay: 'viewer' }, '');
    const onPop = () => onCloseRef.current();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [isOpen]);

  if (!isOpen || !media) return null;

  const isVideo = media.media_type === 'VIDEO';
  const streamUrl = mediaApi.getStreamUrl(media.id);

  return (
    <div className='fixed inset-0 z-50 flex bg-black/95 backdrop-blur-md overflow-hidden select-none animate-in fade-in duration-150'>
      {/* Main Preview / Lightbox Canvas */}
      <div className='flex-1 flex flex-col h-full relative'>
        {/* Top Header Bar */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-[#232736] bg-[#090A0F]/70'>
          <div className='flex items-center gap-3'>
            <h3 className='text-sm font-semibold text-white truncate max-w-md'>{media.filename}</h3>
            <span className='px-2 py-0.5 rounded text-xs font-semibold bg-[#1A1D28] text-[#A0A6B8] border border-[#232736]'>
              {media.media_type}
            </span>
            {currentIndex >= 0 && itemsList.length > 0 && (
              <span className='text-xs text-[#6B7280] font-mono'>
                {(currentIndex + 1) + ' of ' + itemsList.length}
              </span>
            )}
          </div>

          <div className='flex items-center gap-2'>
            {!isVideo && (
              <button
                onClick={() => setIsZoomed(!isZoomed)}
                className='p-2 rounded-xl bg-[#1A1D28] text-[#A0A6B8] hover:text-white transition-colors'
                title='Toggle Zoom'
              >
                {isZoomed ? <ZoomOut className='w-4 h-4' /> : <ZoomIn className='w-4 h-4' />}
              </button>
            )}

            {onToggleFavorite && (
              <button
                onClick={onToggleFavorite}
                className={'p-2 rounded-xl transition-colors ' + (isFavorite ? 'bg-[#FFB300] text-black shadow' : 'bg-[#1A1D28] text-[#A0A6B8] hover:text-white')}
                title='Toggle Favorite (F)'
              >
                <Star className={'w-4 h-4 ' + (isFavorite ? 'fill-black' : '')} />
              </button>
            )}

            <button
              onClick={onClose}
              className='p-2 rounded-xl bg-[#1A1D28] text-[#A0A6B8] hover:text-white transition-colors'
              title='Close (Esc)'
            >
              <X className='w-4 h-4' />
            </button>
          </div>
        </div>

        {/* Center Media Viewer Area */}
        <div className='flex-1 flex items-center justify-center p-6 overflow-hidden relative'>
          {/* Previous Arrow Button */}
          {hasPrevious && (
            <button
              onClick={navigatePrev}
              className='absolute left-6 z-30 p-3 rounded-2xl bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-all shadow-xl'
              title='Previous (Left Arrow)'
            >
              <ChevronLeft className='w-6 h-6' />
            </button>
          )}

          {isVideo ? (
            <div className='w-full max-w-5xl'>
              <VideoPlayer mediaId={media.id} filename={media.filename} onClose={onClose} />
            </div>
          ) : (
            <div className='w-full h-full flex items-center justify-center overflow-auto'>
              <img
                src={streamUrl}
                alt={media.filename}
                onError={(e) => {
                  // If browser cannot decode HEIC stream, fallback to converted JPEG thumbnail
                  const fallback = mediaApi.getThumbnailUrl(media.id);
                  if (e.currentTarget.src !== fallback) {
                    e.currentTarget.src = fallback;
                  }
                }}
                className={'object-contain rounded-xl shadow-2xl transition-all duration-300 ' + (isZoomed ? 'max-w-none cursor-zoom-out' : 'max-w-full max-h-full cursor-zoom-in')}
                onClick={() => setIsZoomed(!isZoomed)}
              />
            </div>
          )}

          {/* Next Arrow Button */}
          {hasNext && (
            <button
              onClick={navigateNext}
              className='absolute right-6 z-30 p-3 rounded-2xl bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-all shadow-xl'
              title='Next (Right Arrow)'
            >
              <ChevronRight className='w-6 h-6' />
            </button>
          )}
        </div>
      </div>

      {/* Right Metadata Inspector Panel */}
      <div className='w-80 bg-[#12141C] border-l border-[#232736] p-6 overflow-y-auto flex flex-col gap-6'>
        <div>
          <h4 className='text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-3'>
            File Metadata
          </h4>
          <div className='space-y-3 text-xs'>
            <div className='flex items-center gap-2.5 text-[#A0A6B8]'>
              <HardDrive className='w-4 h-4 text-(--mm-accent)' />
              <span>{formatBytes(media.size_bytes)}</span>
            </div>
            <div className='flex items-center gap-2.5 text-[#A0A6B8]'>
              <Calendar className='w-4 h-4 text-(--mm-accent)' />
              <span>{formatDate(media.capture_date || media.imported_at)}</span>
            </div>
            {media.width && media.height && (
              <div className='flex items-center gap-2.5 text-[#A0A6B8]'>
                <Maximize2 className='w-4 h-4 text-(--mm-accent)' />
                <span>{media.width + ' x ' + media.height + ' px'}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className='text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-3'>
            Integrity & Hash
          </h4>
          <div className='p-3 bg-[#1A1D28] rounded-xl border border-[#232736] text-[11px] font-mono break-all text-[#A0A6B8]'>
            <div className='flex items-center gap-1.5 text-xs font-semibold text-[#00D68F] mb-1'>
              <Hash className='w-3.5 h-3.5' /> SHA-256 Verified
            </div>
            {media.hash_sha256}
          </div>
        </div>

        <div>
          <h4 className='text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-3'>
            Library Relative Path
          </h4>
          <p className='text-xs font-mono text-[#A0A6B8] break-all bg-[#1A1D28] p-3 rounded-xl border border-[#232736]'>
            {media.relative_path}
          </p>
        </div>
      </div>
    </div>
  );
};
