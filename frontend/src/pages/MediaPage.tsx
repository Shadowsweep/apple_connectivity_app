import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteMediaList, useFavorites, useToggleFavorite, useTrashMedia, useBackfillDurations } from '../hooks/useMedia';
import { FilterToolbar } from '../components/media/FilterToolbar';
import { SmartCollectionsBar } from '../components/media/SmartCollectionsBar';
import { FilterBuilderModal } from '../components/media/FilterBuilderModal';
import { MediaGrid } from '../components/media/MediaGrid';
import { MediaViewer } from '../components/media/MediaViewer';
import { AddToAlbumModal } from '../components/album/AddToAlbumModal';
import { AddToFolderModal } from '../components/media/AddToFolderModal';
import { Button } from '../components/common/Button';
import { FolderPlus, Folder, X, Trash2, CheckSquare } from '../components/icons';
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [albumTargetIds, setAlbumTargetIds] = useState<string[] | null>(null);
  const [folderTargetIds, setFolderTargetIds] = useState<string[] | null>(null);

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

  // Query media list with infinite loading for older photos
  const {
    data: infiniteData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteMediaList({
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
    limit: 100,
  });

  const mediaItems = useMemo(
    () => infiniteData?.pages.flatMap((page) => page.items) || [],
    [infiniteData]
  );
  const totalCount = infiniteData?.pages[0]?.total ?? 0;

  // Infinite scroll observer to auto-fetch next page as user reaches bottom
  const loadMoreRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: '400px' }
    );
    const el = loadMoreRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { data: favorites } = useFavorites();
  const toggleFavoriteMutation = useToggleFavorite();
  const addToAlbumMutation = useAddToAlbum();
  const trashMutation = useTrashMedia();
  const backfillMutation = useBackfillDurations();

  // One-shot: fill in missing video durations so cards don't show blank badges
  useEffect(() => {
    backfillMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const favSet = useMemo(() => new Set((favorites || []).map((f) => f.id)), [favorites]);

  const toggleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelecting(false);
  };

  const handleBatchTrash = () => {
    if (selectedIds.size === 0) return;
    trashMutation.mutate(Array.from(selectedIds), { onSuccess: clearSelection });
  };

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
        totalCount={totalCount}
        onOpenAdvancedFilters={() => setIsFilterModalOpen(true)}
        activeFilterCount={activeFilterCount}
        currentSort={currentFilters.sort || 'newest'}
        onSortChange={(s) => updateFilters({ ...currentFilters, sort: s as MediaFilters['sort'] })}
      />

      {/* Selection Toolbar */}
      {selectedIds.size > 0 ? (
        <div className='flex items-center justify-between px-4 py-2.5 rounded-xl bg-(--mm-accent)/10 border border-(--mm-accent)/40'>
          <span className='text-sm font-semibold text-white'>
            {selectedIds.size} selected
          </span>
          <div className='flex items-center gap-2'>
            <Button
              variant='primary'
              size='sm'
              icon={<Folder className='w-3.5 h-3.5' />}
              onClick={() => setFolderTargetIds(Array.from(selectedIds))}
            >
              Add to Folder
            </Button>
            <Button
              variant='secondary'
              size='sm'
              icon={<FolderPlus className='w-3.5 h-3.5' />}
              onClick={() => setAlbumTargetIds(Array.from(selectedIds))}
              disabled={addToAlbumMutation.isPending}
            >
              Add to Album
            </Button>
            <Button
              variant='secondary'
              size='sm'
              icon={<Trash2 className='w-3.5 h-3.5' />}
              onClick={handleBatchTrash}
              disabled={trashMutation.isPending}
            >
              Move to Trash
            </Button>
            <Button variant='secondary' size='sm' icon={<X className='w-3.5 h-3.5' />} onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      ) : (
        <div className='flex justify-end'>
          <Button variant='secondary' size='sm' icon={<CheckSquare className='w-3.5 h-3.5' />} onClick={() => setIsSelecting(true)}>
            Select
          </Button>
        </div>
      )}

      {/* Media Grid */}
      <MediaGrid
        items={mediaItems}
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
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        showSelect={isSelecting || selectedIds.size > 0}
        onAddToAlbum={(media) => setAlbumTargetIds([media.id])}
        onAddToFolder={(media) => setFolderTargetIds([media.id])}
      />

      {/* Infinite Scroll / Load More Footer */}
      {mediaItems.length > 0 && (
        <div className='flex flex-col items-center justify-center py-6 gap-3 border-t border-[#232736]/40 mt-6'>
          <span className='text-xs text-[#6B7280]'>
            Showing {mediaItems.length.toLocaleString()} of {totalCount.toLocaleString()} items
          </span>
          {hasNextPage ? (
            <Button
              variant='secondary'
              size='md'
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Loading older photos...' : 'Load More Older Photos'}
            </Button>
          ) : (
            <span className='text-xs text-[#A0A6B8]/60'>All {totalCount.toLocaleString()} items loaded</span>
          )}
          {/* Sentinel for auto scroll loading */}
          <div ref={loadMoreRef} className='h-4 w-full pointer-events-none' />
        </div>
      )}

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
        itemsList={mediaItems}
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

      {/* Add To Album Modal (single via context menu, or batch via selection) */}
      {albumTargetIds && albumTargetIds.length > 0 && (
        <AddToAlbumModal
          isOpen={!!albumTargetIds}
          mediaIds={albumTargetIds}
          onClose={() => setAlbumTargetIds(null)}
          onAdd={(albumId) => {
            addToAlbumMutation.mutate({ albumId, mediaIds: albumTargetIds });
            clearSelection();
          }}
        />
      )}

      {/* Add To Vault Folder Modal (move/copy to folder inside vault) */}
      {folderTargetIds && folderTargetIds.length > 0 && (
        <AddToFolderModal
          isOpen={!!folderTargetIds}
          mediaIds={folderTargetIds}
          onClose={() => setFolderTargetIds(null)}
          onSuccess={clearSelection}
        />
      )}
    </div>
  );
};
