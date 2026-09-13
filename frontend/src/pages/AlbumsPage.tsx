import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderHeart, Plus, Trash2 } from 'lucide-react';
import { useAlbums, useCreateAlbum, useDeleteAlbum } from '../hooks/useAlbums';
import { CreateAlbumModal } from '../components/album/CreateAlbumModal';
import { Button } from '../components/common/Button';

export const AlbumsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: albums, isLoading } = useAlbums();
  const createAlbumMutation = useCreateAlbum();
  const deleteAlbumMutation = useDeleteAlbum();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className='space-y-6 max-w-7xl mx-auto'>
      <div className='flex items-center justify-between pb-4 border-b border-[#232736]'>
        <div>
          <h2 className='text-lg font-bold text-white'>Virtual Albums</h2>
          <p className='text-xs text-[#A0A6B8]'>
            Organize media into custom collections without duplicating files on disk.
          </p>
        </div>
        <Button
          variant='primary'
          size='sm'
          icon={<Plus className='w-4 h-4' />}
          onClick={() => setIsCreateOpen(true)}
        >
          New Album
        </Button>
      </div>

      {isLoading ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='aspect-video bg-[#1A1D28] rounded-2xl animate-pulse border border-[#232736]' />
          ))}
        </div>
      ) : albums && albums.length > 0 ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
          {albums.map((album) => (
            <div
              key={album.id}
              onClick={() => navigate('/albums/' + album.id)}
              className='group bg-[#1A1D28] rounded-2xl p-5 border border-[#232736] hover:border-[#2E7CF6]/50 cursor-pointer transition-all space-y-3'
            >
              <div className='flex items-center justify-between'>
                <div className='p-3 rounded-xl bg-[#2E7CF6]/15 text-[#2E7CF6]'>
                  <FolderHeart className='w-6 h-6' />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete album ' + album.name + '? (Media files will not be deleted)')) {
                      deleteAlbumMutation.mutate(album.id);
                    }
                  }}
                  className='p-1.5 text-[#6B7280] hover:text-[#FF3B30] rounded-lg opacity-0 group-hover:opacity-100 transition-all'
                >
                  <Trash2 className='w-4 h-4' />
                </button>
              </div>

              <div>
                <h4 className='text-sm font-semibold text-white truncate'>{album.name}</h4>
                {album.description && (
                  <p className='text-xs text-[#A0A6B8] truncate'>{album.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className='text-center py-20 bg-[#1A1D28] rounded-3xl border border-[#232736] p-8'>
          <FolderHeart className='w-12 h-12 text-[#6B7280] mx-auto mb-3' />
          <h3 className='text-sm font-semibold text-white mb-1'>No albums yet</h3>
          <p className='text-xs text-[#A0A6B8] mb-4'>
            Create custom collections to categorize vacations, family events, or project clips.
          </p>
          <Button variant='primary' size='sm' onClick={() => setIsCreateOpen(true)}>
            Create First Album
          </Button>
        </div>
      )}

      <CreateAlbumModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={(name, desc) => createAlbumMutation.mutate({ name, description: desc })}
      />
    </div>
  );
};
