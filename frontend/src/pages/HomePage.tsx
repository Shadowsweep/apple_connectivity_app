import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image, Video, Sparkles, Download, Play, Clock, HardDrive } from 'lucide-react';
import { useLibraryInfo } from '../hooks/useLibrary';
import { useMediaList, useFavorites, useToggleFavorite } from '../hooks/useMedia';
import { useContinueWatching } from '../hooks/usePlayback';
import { MediaCard } from '../components/media/MediaCard';
import { MediaViewer } from '../components/media/MediaViewer';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { Button } from '../components/common/Button';
import { MediaRecord } from '../types/media';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { data: lib } = useLibraryInfo();
  const { data: recentMedia, isLoading: isRecentLoading } = useMediaList({ limit: 12 });
  const { data: favorites } = useFavorites();
  const { data: continueWatching } = useContinueWatching();
  const toggleFavoriteMutation = useToggleFavorite();

  const [inspectingMedia, setInspectingMedia] = useState<MediaRecord | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const favSet = new Set((favorites || []).map((f) => f.id));

  return (
    <div className='space-y-8 max-w-7xl mx-auto'>
      {/* Hero Welcome Card */}
      <div className='relative overflow-hidden bg-gradient-to-r from-[#1A1D28] via-[#12141C] to-[#1A1D28] border border-[#232736] rounded-3xl p-8 shadow-2xl'>
        <div className='max-w-xl space-y-3 z-10 relative'>
          <span className='px-3 py-1 rounded-full text-xs font-semibold bg-[#2E7CF6]/20 text-[#2E7CF6] border border-[#2E7CF6]/30 inline-flex items-center gap-1.5'>
            <Sparkles className='w-3.5 h-3.5' /> Local-First Media Vault
          </span>
          <h1 className='text-3xl font-extrabold text-white tracking-tight'>
            Welcome to MEMEASY
          </h1>
          <p className='text-xs text-[#A0A6B8] leading-relaxed'>
            Safe iPhone import, zero cloud dependency, SHA-256 integrity verification, and instant local playback.
          </p>
          <div className='flex items-center gap-3 pt-2'>
            <Button
              variant='primary'
              icon={<Download className='w-4 h-4' />}
              onClick={() => navigate('/import')}
            >
              Start Safe Import
            </Button>
            <Button
              variant='secondary'
              icon={<Image className='w-4 h-4' />}
              onClick={() => navigate('/media')}
            >
              Browse Library
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div className='p-5 bg-[#1A1D28] rounded-2xl border border-[#232736] flex items-center gap-4'>
          <div className='p-3 rounded-xl bg-[#2E7CF6]/15 text-[#2E7CF6]'>
            <Image className='w-6 h-6' />
          </div>
          <div>
            <span className='text-xs text-[#6B7280] block font-medium'>Total Media</span>
            <span className='text-xl font-bold text-white'>
              {lib ? lib.total_media_count : '...'}
            </span>
          </div>
        </div>

        <div className='p-5 bg-[#1A1D28] rounded-2xl border border-[#232736] flex items-center gap-4'>
          <div className='p-3 rounded-xl bg-[#00D68F]/15 text-[#00D68F]'>
            <HardDrive className='w-6 h-6' />
          </div>
          <div>
            <span className='text-xs text-[#6B7280] block font-medium'>Free Usable Disk</span>
            <span className='text-xl font-bold text-white'>
              {lib ? lib.formatted_usable : '...'}
            </span>
          </div>
        </div>

        <div className='p-5 bg-[#1A1D28] rounded-2xl border border-[#232736] flex items-center gap-4'>
          <div className='p-3 rounded-xl bg-[#FFB300]/15 text-[#FFB300]'>
            <Sparkles className='w-6 h-6' />
          </div>
          <div>
            <span className='text-xs text-[#6B7280] block font-medium'>Starred Favorites</span>
            <span className='text-xl font-bold text-white'>{favorites?.length || 0}</span>
          </div>
        </div>

        <div className='p-5 bg-[#1A1D28] rounded-2xl border border-[#232736] flex items-center gap-4'>
          <div className='p-3 rounded-xl bg-purple-500/15 text-purple-400'>
            <Clock className='w-6 h-6' />
          </div>
          <div>
            <span className='text-xs text-[#6B7280] block font-medium'>Continue Watching</span>
            <span className='text-xl font-bold text-white'>
              {continueWatching?.length || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Continue Watching Carousel */}
      {continueWatching && continueWatching.length > 0 && (
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='text-base font-bold text-white flex items-center gap-2'>
              <Play className='w-4 h-4 text-[#2E7CF6] fill-[#2E7CF6]' /> Continue Watching
            </h3>
          </div>

          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
            {continueWatching.map(({ media, progress }) => (
              <div key={media.id} className='relative space-y-2'>
                <MediaCard
                  media={media}
                  isFavorite={favSet.has(media.id)}
                  onToggleFavorite={() =>
                    toggleFavoriteMutation.mutate({
                      mediaId: media.id,
                      isFavorite: favSet.has(media.id),
                    })
                  }
                  onClick={() => setPlayingVideoId(media.id)}
                />
                {/* Progress bar underneath */}
                <div className='w-full bg-[#1A1D28] h-1.5 rounded-full overflow-hidden'>
                  <div
                    className='bg-[#2E7CF6] h-full'
                    style={{
                      width: ((progress.position_ms / progress.duration_ms) * 100) + '%',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Imported Media */}
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h3 className='text-base font-bold text-white'>Recently Added</h3>
          <Button variant='ghost' size='sm' onClick={() => navigate('/media')}>
            View All Media
          </Button>
        </div>

        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3'>
          {recentMedia?.items.map((media) => (
            <MediaCard
              key={media.id}
              media={media}
              isFavorite={favSet.has(media.id)}
              onToggleFavorite={() =>
                toggleFavoriteMutation.mutate({
                  mediaId: media.id,
                  isFavorite: favSet.has(media.id),
                })
              }
              onClick={() => setInspectingMedia(media)}
            />
          ))}
        </div>
      </div>

      {/* Video Modal Player */}
      {playingVideoId && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/90 backdrop-blur-md'>
          <div className='relative w-full max-w-5xl bg-[#12141C] rounded-2xl overflow-hidden border border-[#232736] p-4'>
            <div className='flex justify-end mb-2'>
              <Button variant='ghost' size='sm' onClick={() => setPlayingVideoId(null)}>
                Close Player
              </Button>
            </div>
            <VideoPlayer mediaId={playingVideoId} />
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      <MediaViewer
        media={inspectingMedia}
        isOpen={!!inspectingMedia}
        onClose={() => setInspectingMedia(null)}
        isFavorite={inspectingMedia ? favSet.has(inspectingMedia.id) : false}
        onToggleFavorite={() => {
          if (inspectingMedia) {
            toggleFavoriteMutation.mutate({
              mediaId: inspectingMedia.id,
              isFavorite: favSet.has(inspectingMedia.id),
            });
          }
        }}
      />
    </div>
  );
};
