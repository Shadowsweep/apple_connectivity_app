import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image, Video, Sparkles, Star, Play, Clock, HardDrive, X } from '../components/icons';
import { useLibraryInfo } from '../hooks/useLibrary';
import { useMediaList, useFavorites, useToggleFavorite } from '../hooks/useMedia';
import { useContinueWatching } from '../hooks/usePlayback';
import { HeroBanner } from '../components/media/HeroBanner';
import { MediaRow } from '../components/media/MediaRow';
import { MediaViewer } from '../components/media/MediaViewer';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { MediaRecord } from '../types/media';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { data: lib } = useLibraryInfo();
  
  const { data: recentMedia } = useMediaList({ limit: 16 });
  const { data: photoMedia } = useMediaList({ type: 'PHOTO', limit: 16 });
  const { data: videoMedia } = useMediaList({ type: 'VIDEO', limit: 16 });
  const { data: favorites } = useFavorites();
  const { data: continueWatching } = useContinueWatching();
  const toggleFavoriteMutation = useToggleFavorite();

  const [inspectingMedia, setInspectingMedia] = useState<MediaRecord | null>(null);
  const [activeItemsList, setActiveItemsList] = useState<MediaRecord[]>([]);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // Browser Back closes the video modal instead of navigating away
  React.useEffect(() => {
    if (!playingVideoId) return;
    window.history.pushState({ mmOverlay: 'video' }, '');
    const onPop = () => setPlayingVideoId(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [playingVideoId]);

  const favSet = useMemo(() => new Set((favorites || []).map((f) => f.id)), [favorites]);

  const featuredMedia = useMemo(() => {
    if (favorites && favorites.length > 0) return favorites[0];
    if (recentMedia && recentMedia.items.length > 0) return recentMedia.items[0];
    return null;
  }, [favorites, recentMedia]);

  const handleOpenMedia = (media: MediaRecord, listContext: MediaRecord[] = []) => {
    if (media.media_type === 'VIDEO') {
      setPlayingVideoId(media.id);
    } else {
      setActiveItemsList(listContext.length > 0 ? listContext : [media]);
      setInspectingMedia(media);
    }
  };

  const continueWatchingMedia = useMemo(() => {
    return (continueWatching || []).map((cw) => cw.media);
  }, [continueWatching]);

  return (
    <div className='space-y-10 max-w-7xl mx-auto pb-12'>
      {/* Cinematic Hero Section */}
      <HeroBanner
        featuredMedia={featuredMedia}
        totalCount={lib?.total_media_count || 0}
        photosCount={photoMedia?.count || 0}
        videosCount={videoMedia?.count || 0}
        onOpenMedia={(m) => handleOpenMedia(m, recentMedia?.items || [])}
        onBrowseLibrary={() => navigate('/media')}
      />

      {/* Quick Metrics Bar */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div className='p-4 bg-[#1A1D28]/60 rounded-2xl border border-[#232736] flex items-center gap-3.5'>
          <div className='p-2.5 rounded-xl bg-(--mm-accent)/15 text-(--mm-accent)'>
            <Image className='w-5 h-5' />
          </div>
          <div>
            <span className='text-[11px] text-[#6B7280] block font-medium uppercase tracking-wider'>Total Library</span>
            <span className='text-lg font-bold text-white'>
              {lib ? lib.total_media_count : '...'} items
            </span>
          </div>
        </div>

        <div className='p-4 bg-[#1A1D28]/60 rounded-2xl border border-[#232736] flex items-center gap-3.5'>
          <div className='p-2.5 rounded-xl bg-[#00D68F]/15 text-[#00D68F]'>
            <HardDrive className='w-5 h-5' />
          </div>
          <div>
            <span className='text-[11px] text-[#6B7280] block font-medium uppercase tracking-wider'>Free Storage</span>
            <span className='text-lg font-bold text-white'>
              {lib ? lib.formatted_usable : '...'}
            </span>
          </div>
        </div>

        <div className='p-4 bg-[#1A1D28]/60 rounded-2xl border border-[#232736] flex items-center gap-3.5'>
          <div className='p-2.5 rounded-xl bg-[#FFB300]/15 text-[#FFB300]'>
            <Star className='w-5 h-5 fill-[#FFB300]' />
          </div>
          <div>
            <span className='text-[11px] text-[#6B7280] block font-medium uppercase tracking-wider'>Favorites</span>
            <span className='text-lg font-bold text-white'>{favorites?.length || 0} items</span>
          </div>
        </div>

        <div className='p-4 bg-[#1A1D28]/60 rounded-2xl border border-[#232736] flex items-center gap-3.5'>
          <div className='p-2.5 rounded-xl bg-purple-500/15 text-purple-400'>
            <Clock className='w-5 h-5' />
          </div>
          <div>
            <span className='text-[11px] text-[#6B7280] block font-medium uppercase tracking-wider'>In Progress</span>
            <span className='text-lg font-bold text-white'>
              {continueWatching?.length || 0} videos
            </span>
          </div>
        </div>
      </div>

      {/* Media Rows / Reels */}
      <div className='space-y-8'>
        {/* Continue Watching Row */}
        {continueWatchingMedia.length > 0 && (
          <MediaRow
            title='Continue Watching'
            icon={<Play className='w-4 h-4 fill-(--mm-accent)' />}
            items={continueWatchingMedia}
            favoriteIds={favSet}
            onToggleFavorite={(m) =>
              toggleFavoriteMutation.mutate({
                mediaId: m.id,
                isFavorite: favSet.has(m.id),
              })
            }
            onSelectMedia={(m) => handleOpenMedia(m, continueWatchingMedia)}
          />
        )}

        {/* Recently Added Row */}
        {recentMedia && recentMedia.items.length > 0 && (
          <MediaRow
            title='Recently Added'
            icon={<Sparkles className='w-4 h-4' />}
            items={recentMedia.items}
            favoriteIds={favSet}
            onToggleFavorite={(m) =>
              toggleFavoriteMutation.mutate({
                mediaId: m.id,
                isFavorite: favSet.has(m.id),
              })
            }
            onSelectMedia={(m) => handleOpenMedia(m, recentMedia.items)}
            onSeeAll={() => navigate('/media')}
          />
        )}

        {/* Recent Photos Row */}
        {photoMedia && photoMedia.items.length > 0 && (
          <MediaRow
            title='Photos'
            icon={<Image className='w-4 h-4' />}
            items={photoMedia.items}
            favoriteIds={favSet}
            onToggleFavorite={(m) =>
              toggleFavoriteMutation.mutate({
                mediaId: m.id,
                isFavorite: favSet.has(m.id),
              })
            }
            onSelectMedia={(m) => {
              setActiveItemsList(photoMedia.items);
              setInspectingMedia(m);
            }}
            onSeeAll={() => navigate('/photos')}
          />
        )}

        {/* Recent Videos Row */}
        {videoMedia && videoMedia.items.length > 0 && (
          <MediaRow
            title='Videos & 4K Clips'
            icon={<Video className='w-4 h-4' />}
            items={videoMedia.items}
            favoriteIds={favSet}
            onToggleFavorite={(m) =>
              toggleFavoriteMutation.mutate({
                mediaId: m.id,
                isFavorite: favSet.has(m.id),
              })
            }
            onSelectMedia={(m) => setPlayingVideoId(m.id)}
            onSeeAll={() => navigate('/videos')}
          />
        )}

        {/* Starred Favorites Row */}
        {favorites && favorites.length > 0 && (
          <MediaRow
            title='Favorites'
            icon={<Star className='w-4 h-4 fill-[#FFB300] text-[#FFB300]' />}
            items={favorites}
            favoriteIds={favSet}
            onToggleFavorite={(m) =>
              toggleFavoriteMutation.mutate({
                mediaId: m.id,
                isFavorite: favSet.has(m.id),
              })
            }
            onSelectMedia={(m) => handleOpenMedia(m, favorites)}
            onSeeAll={() => navigate('/favorites')}
          />
        )}
      </div>

      {/* Standalone Video Modal Player */}
      {playingVideoId && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-md'
          onClick={() => setPlayingVideoId(null)}
        >
          <div
            className='relative w-full max-w-5xl bg-[#12141C] rounded-2xl overflow-hidden border border-[#232736] p-4 shadow-2xl'
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPlayingVideoId(null)}
              title='Close (Esc)'
              className='absolute top-3 right-3 z-20 p-2 rounded-xl bg-black/60 text-white/80 hover:text-white hover:bg-black/90 transition-colors'
            >
              <X className='w-4 h-4' />
            </button>
            <VideoPlayer
              mediaId={playingVideoId}
              onClose={() => setPlayingVideoId(null)}
            />
          </div>
        </div>
      )}

      {/* Media Viewer Lightbox */}
      <MediaViewer
        media={inspectingMedia}
        itemsList={activeItemsList}
        isOpen={!!inspectingMedia}
        onClose={() => setInspectingMedia(null)}
        onNavigate={(m) => setInspectingMedia(m)}
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
