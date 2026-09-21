import React, { useState } from 'react';
import { Star } from '../components/icons';
import { useFavorites, useToggleFavorite } from '../hooks/useMedia';
import { MediaGrid } from '../components/media/MediaGrid';
import { MediaViewer } from '../components/media/MediaViewer';
import { MediaRecord } from '../types/media';

export const FavoritesPage: React.FC = () => {
  const { data: favorites, isLoading } = useFavorites();
  const toggleFavoriteMutation = useToggleFavorite();
  const [inspectingMedia, setInspectingMedia] = useState<MediaRecord | null>(null);

  const favSet = new Set((favorites || []).map((f) => f.id));

  return (
    <div className='space-y-6 max-w-7xl mx-auto'>
      <div className='flex items-center justify-between pb-4 border-b border-[#232736]'>
        <div>
          <h2 className='text-lg font-bold text-white flex items-center gap-2'>
            <Star className='w-5 h-5 text-[#FFB300] fill-[#FFB300]' /> Starred Favorites
          </h2>
          <p className='text-xs text-[#A0A6B8]'>
            Instant access to all your pinned photos and top videos.
          </p>
        </div>
      </div>

      <MediaGrid
        items={favorites || []}
        favoriteIds={favSet}
        isLoading={isLoading}
        groupByMonth
        onToggleFavorite={(media) =>
          toggleFavoriteMutation.mutate({
            mediaId: media.id,
            isFavorite: favSet.has(media.id),
          })
        }
        onSelectMedia={(media) => setInspectingMedia(media)}
      />

      <MediaViewer
        media={inspectingMedia}
        itemsList={favorites || []}
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
