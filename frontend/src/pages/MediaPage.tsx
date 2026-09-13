import React, { useState } from 'react';
import { useMediaList, useFavorites, useToggleFavorite } from '../hooks/useMedia';
import { FilterToolbar } from '../components/media/FilterToolbar';
import { MediaGrid } from '../components/media/MediaGrid';
import { MediaViewer } from '../components/media/MediaViewer';
import { AddToAlbumModal } from '../components/album/AddToAlbumModal';
import { useAddToAlbum } from '../hooks/useAlbums';
import { MediaType, MediaRecord } from '../types/media';

interface MediaPageProps {
  initialType?: MediaType | 'ALL';
}

export const MediaPage: React.FC<MediaPageProps> = ({ initialType = 'ALL' }) => {
  const [currentType, setCurrentType] = useState<MediaType | 'ALL'>(initialType);
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingMedia, setInspectingMedia] = useState<MediaRecord | null>(null);
  const [selectedMediaForAlbum, setSelectedMediaForAlbum] = useState<string | null>(null);

  const { data: mediaList, isLoading } = useMediaList({
    type: currentType === 'ALL' ? undefined : currentType,
    search: searchQuery || undefined,
    limit: 150,
  });

  const { data: favorites } = useFavorites();
  const toggleFavoriteMutation = useToggleFavorite();
  const addToAlbumMutation = useAddToAlbum();

  const favSet = new Set((favorites || []).map((f) => f.id));

  return (
    <div className='space-y-6 max-w-7xl mx-auto'>
      <FilterToolbar
        currentType={currentType}
        onTypeChange={setCurrentType}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={mediaList?.count}
      />

      <MediaGrid
        items={mediaList?.items || []}
        favoriteIds={favSet}
        isLoading={isLoading}
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
        itemsList={mediaList?.items || []}
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

      {selectedMediaForAlbum && (
        <AddToAlbumModal
          isOpen={!!selectedMediaForAlbum}
          mediaId={selectedMediaForAlbum}
          onClose={() => setSelectedMediaForAlbum(null)}
          onAdd={(albumId) => {
            addToAlbumMutation.mutate({ albumId, mediaId: selectedMediaForAlbum });
          }}
        />
      )}
    </div>
  );
};
