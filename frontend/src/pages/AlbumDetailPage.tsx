import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, FolderHeart } from 'lucide-react';
import { useAlbum, useRemoveFromAlbum } from '../hooks/useAlbums';
import { useFavorites, useToggleFavorite } from '../hooks/useMedia';
import { MediaGrid } from '../components/media/MediaGrid';
import { MediaViewer } from '../components/media/MediaViewer';
import { Button } from '../components/common/Button';
import { MediaRecord } from '../types/media';

export const AlbumDetailPage: React.FC = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const { data: albumDetail, isLoading } = useAlbum(albumId || null);
  const removeFromAlbumMutation = useRemoveFromAlbum();
  const { data: favorites } = useFavorites();
  const toggleFavoriteMutation = useToggleFavorite();

  const [inspectingMedia, setInspectingMedia] = useState<MediaRecord | null>(null);

  const favSet = new Set((favorites || []).map((f) => f.id));

  if (isLoading) {
    return <div className='p-8 text-xs text-[#A0A6B8]'>Loading album...</div>;
  }

  if (!albumDetail) {
    return (
      <div className='p-8 text-center space-y-4'>
        <p className='text-sm text-[#A0A6B8]'>Album not found.</p>
        <Button variant='secondary' size='sm' onClick={() => navigate('/albums')}>
          Back to Albums
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-6 max-w-7xl mx-auto'>
      <div className='flex items-center justify-between pb-4 border-b border-[#232736]'>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => navigate('/albums')}
            className='p-2 rounded-xl bg-[#1A1D28] text-[#A0A6B8] hover:text-white border border-[#232736]'
          >
            <ArrowLeft className='w-4 h-4' />
          </button>
          <div>
            <h2 className='text-lg font-bold text-white'>{albumDetail.album.name}</h2>
            <p className='text-xs text-[#A0A6B8]'>
              {albumDetail.items.length + ' items in this album'}
            </p>
          </div>
        </div>
      </div>

      <MediaGrid
        items={albumDetail.items}
        favoriteIds={favSet}
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
        itemsList={albumDetail.items}
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
