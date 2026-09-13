import React from 'react';
import { X, Star, Calendar, HardDrive, Hash, Maximize2 } from 'lucide-react';
import { MediaRecord } from '../../types/media';
import { mediaApi } from '../../api/mediaApi';
import { VideoPlayer } from '../player/VideoPlayer';
import { formatBytes, formatDate } from '../../utils/formatters';

interface MediaViewerProps {
  media: MediaRecord | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  media,
  isOpen,
  onClose,
  isFavorite = false,
  onToggleFavorite,
}) => {
  if (!isOpen || !media) return null;

  const isVideo = media.media_type === 'VIDEO';
  const streamUrl = mediaApi.getStreamUrl(media.id);

  return (
    <div className='fixed inset-0 z-50 flex bg-black/90 backdrop-blur-md overflow-hidden'>
      <div className='flex-1 flex flex-col h-full'>
        <div className='flex items-center justify-between px-6 py-4 border-b border-[#232736] bg-[#090A0F]/60'>
          <div className='flex items-center gap-3'>
            <h3 className='text-sm font-semibold text-white truncate max-w-md'>{media.filename}</h3>
            <span className='px-2 py-0.5 rounded text-xs font-semibold bg-[#1A1D28] text-[#A0A6B8] border border-[#232736]'>
              {media.media_type}
            </span>
          </div>

          <div className='flex items-center gap-2'>
            {onToggleFavorite && (
              <button
                onClick={onToggleFavorite}
                className={'p-2 rounded-lg transition-colors ' + (isFavorite ? 'bg-[#FFB300] text-black' : 'bg-[#1A1D28] text-[#A0A6B8] hover:text-white')}
              >
                <Star className={'w-4 h-4 ' + (isFavorite ? 'fill-black' : '')} />
              </button>
            )}

            <button
              onClick={onClose}
              className='p-2 rounded-lg bg-[#1A1D28] text-[#A0A6B8] hover:text-white transition-colors'
            >
              <X className='w-4 h-4' />
            </button>
          </div>
        </div>

        <div className='flex-1 flex items-center justify-center p-6 overflow-hidden'>
          {isVideo ? (
            <div className='w-full max-w-4xl'>
              <VideoPlayer mediaId={media.id} />
            </div>
          ) : (
            <img
              src={streamUrl}
              alt={media.filename}
              className='max-w-full max-h-full object-contain rounded-lg shadow-2xl'
            />
          )}
        </div>
      </div>

      <div className='w-80 bg-[#12141C] border-l border-[#232736] p-6 overflow-y-auto flex flex-col gap-6'>
        <div>
          <h4 className='text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-3'>
            File Details
          </h4>
          <div className='space-y-3 text-xs'>
            <div className='flex items-center gap-2.5 text-[#A0A6B8]'>
              <HardDrive className='w-4 h-4 text-[#2E7CF6]' />
              <span>{formatBytes(media.size_bytes)}</span>
            </div>
            <div className='flex items-center gap-2.5 text-[#A0A6B8]'>
              <Calendar className='w-4 h-4 text-[#2E7CF6]' />
              <span>{formatDate(media.capture_date || media.imported_at)}</span>
            </div>
            {media.width && media.height && (
              <div className='flex items-center gap-2.5 text-[#A0A6B8]'>
                <Maximize2 className='w-4 h-4 text-[#2E7CF6]' />
                <span>{media.width + ' x ' + media.height + ' px'}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className='text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-3'>
            Integrity & Hash
          </h4>
          <div className='p-3 bg-[#1A1D28] rounded-lg border border-[#232736] text-[11px] font-mono break-all text-[#A0A6B8]'>
            <div className='flex items-center gap-1.5 text-xs font-semibold text-[#00D68F] mb-1'>
              <Hash className='w-3.5 h-3.5' /> SHA-256 Verified
            </div>
            {media.hash_sha256}
          </div>
        </div>

        <div>
          <h4 className='text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-3'>
            Storage Path
          </h4>
          <p className='text-xs font-mono text-[#A0A6B8] break-all bg-[#1A1D28] p-3 rounded-lg border border-[#232736]'>
            {media.relative_path}
          </p>
        </div>
      </div>
    </div>
  );
};
