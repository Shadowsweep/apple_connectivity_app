import React from 'react';
import { Play, Sparkles, FolderOpen } from 'lucide-react';
import { MediaRecord } from '../../types/media';
import { mediaApi } from '../../api/mediaApi';
import { Button } from '../common/Button';
import { formatDate } from '../../utils/formatters';

interface HeroBannerProps {
  featuredMedia: MediaRecord | null;
  totalCount?: number;
  photosCount?: number;
  videosCount?: number;
  onOpenMedia: (media: MediaRecord) => void;
  onBrowseLibrary: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  featuredMedia,
  totalCount = 0,
  photosCount = 0,
  videosCount = 0,
  onOpenMedia,
  onBrowseLibrary,
}) => {
  if (!featuredMedia) {
    return (
      <div className='relative w-full h-[320px] bg-gradient-to-r from-[#1A1D28] via-[#12141C] to-[#1A1D28] rounded-3xl border border-[#232736] p-10 flex flex-col justify-end shadow-2xl overflow-hidden'>
        <div className='max-w-xl space-y-3 z-10'>
          <span className='px-3 py-1 rounded-full text-xs font-semibold bg-[#2E7CF6]/20 text-[#2E7CF6] border border-[#2E7CF6]/30 inline-flex items-center gap-1.5'>
            <Sparkles className='w-3.5 h-3.5' /> Personal Media Platform
          </span>
          <h1 className='text-3xl font-extrabold text-white tracking-tight'>
            Welcome to MEMEASY
          </h1>
          <p className='text-xs text-[#A0A6B8]'>
            Import photos and 4K videos from your iPhone with verified SHA-256 local storage.
          </p>
          <div className='pt-2'>
            <Button variant='primary' size='md' onClick={onBrowseLibrary}>
              Browse Library
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const thumbUrl = mediaApi.getStreamUrl(featuredMedia.id);
  const isVideo = featuredMedia.media_type === 'VIDEO';
  const displayDate = formatDate(featuredMedia.capture_date || featuredMedia.imported_at);

  return (
    <div className='relative w-full h-[360px] rounded-3xl overflow-hidden border border-[#232736] shadow-2xl group'>
      {/* Background Image / Stream Preview with Vignette */}
      <img
        src={thumbUrl}
        alt={featuredMedia.filename}
        className='absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105'
      />

      {/* Cinematic Dark Gradient Vignette */}
      <div className='absolute inset-0 bg-gradient-to-t from-[#090A0F] via-[#090A0F]/60 to-transparent' />
      <div className='absolute inset-0 bg-gradient-to-r from-[#090A0F] via-[#090A0F]/50 to-transparent' />

      {/* Content Overlay */}
      <div className='relative h-full flex flex-col justify-end p-8 md:p-10 max-w-2xl space-y-3 z-10'>
        <div className='flex items-center gap-2'>
          <span className='px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#2E7CF6] text-white tracking-wider uppercase'>
            Featured Collection
          </span>
          <span className='text-xs text-[#A0A6B8] font-medium'>
            {displayDate}
          </span>
        </div>

        <h1 className='text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight'>
          {featuredMedia.filename}
        </h1>

        <p className='text-xs text-[#A0A6B8] max-w-lg'>
          {totalCount > 0 ? (photosCount + ' Photos · ' + videosCount + ' Videos in vault') : 'High-resolution local media'}
        </p>

        <div className='flex items-center gap-3 pt-2'>
          <Button
            variant='primary'
            size='md'
            icon={isVideo ? <Play className='w-4 h-4 fill-white' /> : <FolderOpen className='w-4 h-4' />}
            onClick={() => onOpenMedia(featuredMedia)}
          >
            {isVideo ? 'Play Video' : 'Open Photo'}
          </Button>

          <Button variant='secondary' size='md' onClick={onBrowseLibrary}>
            Explore All
          </Button>
        </div>
      </div>
    </div>
  );
};
