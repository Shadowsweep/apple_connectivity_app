import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Image as ImageIcon, Video as VideoIcon, FolderHeart } from '../icons';
import { useMediaList } from '../../hooks/useMedia';
import { useAlbums } from '../../hooks/useAlbums';
import { MediaRecord } from '../../types/media';
import { AlbumRecord } from '../../types/album';
import { mediaApi } from '../../api/mediaApi';
import { formatBytes, formatDuration } from '../../utils/formatters';

interface SearchModalProps {
  isOpen: boolean;
  initialQuery?: string;
  onClose: () => void;
  onSelectMedia: (media: MediaRecord) => void;
  onSelectAlbum: (album: AlbumRecord) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  initialQuery = '',
  onClose,
  onSelectMedia,
  onSelectAlbum,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: mediaResults } = useMediaList({
    search: query.trim() || undefined,
    limit: 20,
  });

  const { data: albums } = useAlbums();

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredAlbums = (albums || []).filter((a) =>
    a.name.toLowerCase().includes(query.toLowerCase())
  );

  const photos = (mediaResults?.items || []).filter((m) => m.media_type === 'PHOTO');
  const videos = (mediaResults?.items || []).filter((m) => m.media_type === 'VIDEO');

  return (
    <div className='fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150'>
      <div className='w-full max-w-2xl bg-[#12141C] border border-[#232736] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]'>
        {/* Search Input Bar */}
        <div className='p-4 border-b border-[#232736] flex items-center gap-3 bg-[#1A1D28]/50'>
          <Search className='w-5 h-5 text-(--mm-accent)' />
          <input
            ref={inputRef}
            type='text'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search photos, videos, albums, or filename...'
            className='flex-1 bg-transparent text-sm text-white placeholder-[#6B7280] focus:outline-none'
          />
          <button
            onClick={onClose}
            className='p-1 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#232736]'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Results Area */}
        <div className='p-6 overflow-y-auto space-y-6'>
          {query.trim().length === 0 ? (
            <div className='py-12 text-center text-xs text-[#6B7280]'>
              Type to instantly search across your local personal library.
            </div>
          ) : (
            <>
              {/* Albums Result */}
              {filteredAlbums.length > 0 && (
                <div className='space-y-2'>
                  <span className='text-[11px] font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-1.5'>
                    <FolderHeart className='w-3.5 h-3.5 text-(--mm-accent)' /> Albums ({filteredAlbums.length})
                  </span>
                  <div className='grid grid-cols-2 gap-2'>
                    {filteredAlbums.map((album) => (
                      <div
                        key={album.id}
                        onClick={() => {
                          onSelectAlbum(album);
                          onClose();
                        }}
                        className='p-3 bg-[#1A1D28] rounded-xl border border-[#232736] hover:border-(--mm-accent)/50 cursor-pointer flex items-center justify-between text-xs'
                      >
                        <span className='font-medium text-white'>{album.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos Result */}
              {videos.length > 0 && (
                <div className='space-y-2'>
                  <span className='text-[11px] font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-1.5'>
                    <VideoIcon className='w-3.5 h-3.5 text-(--mm-accent)' /> Videos ({videos.length})
                  </span>
                  <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                    {videos.map((media) => (
                      <div
                        key={media.id}
                        onClick={() => {
                          onSelectMedia(media);
                          onClose();
                        }}
                        className='p-2 bg-[#1A1D28] rounded-xl border border-[#232736] hover:border-(--mm-accent)/50 cursor-pointer flex items-center gap-2.5 text-xs'
                      >
                        <img
                          src={mediaApi.getThumbnailUrl(media.id)}
                          alt={media.filename}
                          className='w-10 h-10 object-cover rounded-lg'
                        />
                        <div className='truncate'>
                          <span className='font-medium text-white block truncate'>{media.filename}</span>
                          <span className='text-[10px] text-[#6B7280]'>{formatDuration(media.duration_ms)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos Result */}
              {photos.length > 0 && (
                <div className='space-y-2'>
                  <span className='text-[11px] font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-1.5'>
                    <ImageIcon className='w-3.5 h-3.5 text-[#00D68F]' /> Photos ({photos.length})
                  </span>
                  <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                    {photos.map((media) => (
                      <div
                        key={media.id}
                        onClick={() => {
                          onSelectMedia(media);
                          onClose();
                        }}
                        className='group relative aspect-square rounded-xl overflow-hidden border border-[#232736] hover:border-(--mm-accent) cursor-pointer'
                      >
                        <img
                          src={mediaApi.getThumbnailUrl(media.id)}
                          alt={media.filename}
                          className='w-full h-full object-cover group-hover:scale-105 transition-transform'
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {photos.length === 0 && videos.length === 0 && filteredAlbums.length === 0 && (
                <div className='py-12 text-center text-xs text-[#6B7280]'>
                  No media items matching '{query}'.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
