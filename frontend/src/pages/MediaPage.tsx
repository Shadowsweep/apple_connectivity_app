import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMediaList, useFavorites, useToggleFavorite } from '../hooks/useMedia';
import { FilterToolbar } from '../components/media/FilterToolbar';
import { SmartCollectionsBar } from '../components/media/SmartCollectionsBar';
import { FilterBuilderModal } from '../components/media/FilterBuilderModal';
import { MediaGrid } from '../components/media/MediaGrid';
import { MediaViewer } from '../components/media/MediaViewer';
import { AddToAlbumModal } from '../components/album/AddToAlbumModal';
import { useAddToAlbum } from '../hooks/useAlbums';
import { MediaType, MediaRecord } from '../types/media';
import { MediaFilters, filtersToParams, paramsToFilters } from '../types/filters';

interface MediaPageProps {
  initialType?: MediaType | 'ALL';
}

export const MediaPage: React.FC<MediaPageProps> = ({ initialType = 'ALL' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [inspectingMedia, setInspectingMedia] = useState<MediaRecord | null>(null);
  const [selectedMediaForAlbum, setSelectedMediaForAlbum] = useState<string | null>(null);

  // Parse filters from URL
  const currentFilters: MediaFilters = useMemo(() => {
    const f = paramsToFilters(searchParams);
    if (!f.mediaType && initialType !== 'ALL') {
      f.mediaType = initialType;
    }
    return f;
  }, [searchParams, initialType]);

  const activeType = currentFilters.mediaType || initialType || 'ALL';
  const searchQuery = currentFilters.search || '';

  // Query media list with structured parameters
  const { data: mediaList, isLoading } = useMediaList({
    type: activeType === 'ALL' ? undefined : activeType,
    search: searchQuery || undefined,
    start_date: currentFilters.startDate,
    end_date: currentFilters.endDate,
    min_size: currentFilters.minSize,
    max_size: currentFilters.maxSize,
    min_duration: currentFilters.minDuration,
    max_duration: currentFilters.maxDuration,
    min_width: currentFilters.minWidth,
    max_width: currentFilters.maxWidth,
    min_height: currentFilters.minHeight,
    max_height: currentFilters.maxHeight,
    extension: currentFilters.extension,
    favorite: currentFilters.favorite,
    sort: currentFilters.sort || 'newest',
    limit: 150,
  });

  const { data: favorites } = useFavorites();
  const toggleFavoriteMutation = useToggleFavorite();
  const addToAlbumMutation = useAddToAlbum();

  const favSet = useMemo(() => new Set((favorites || []).map((f) => f.id)), [favorites]);

  const updateFilters = (newFilters: MediaFilters) => {
    const p = filtersToParams(newFilters);
    setSearchParams(p);
  };

  const handleTypeChange = (type: MediaType | 'ALL') => {
    updateFilters({ ...currentFilters, mediaType: type === 'ALL' ? undefined : type });
  };

  const handleSearchChange = (query: string) => {
    updateFilters({ ...currentFilters, search: query || undefined });
  };

  // Count active non-default filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (currentFilters.startDate) count++;
    if (currentFilters.endDate) count++;
    if (currentFilters.minSize) count++;
    if (currentFilters.maxSize) count++;
    if (currentFilters.minWidth || currentFilters.minHeight) count++;
    if (currentFilters.extension) count++;
    if (currentFilters.favorite) count++;
    if (currentFilters.sort && currentFilters.sort !== 'newest') count++;
    return count;
  }, [currentFilters]);

  return (
    <div className='space-y-5 max-w-7xl mx-auto pb-12'>
      {/* Smart Collections Preset Bar */}
      <SmartCollectionsBar
        activeFilters={currentFilters}
        onSelectFilters={(f) => updateFilters(f)}
      />

      {/* Main Filter Toolbar */}
      <FilterToolbar
        currentType={activeType}
        onTypeChange={handleTypeChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        totalCount={mediaList?.total !== undefined ? mediaList.total : mediaList?.count}
        onOpenAdvancedFilters={() => setIsFilterModalOpen(true)}
        activeFilterCount={activeFilterCount}
      />

      {/* Media Grid */}
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

      {/* Advanced Filter Builder Modal */}
      <FilterBuilderModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={currentFilters}
        onApplyFilters={updateFilters}
      />

      {/* Media Lightbox Viewer */}
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

      {/* Add To Album Modal */}
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
