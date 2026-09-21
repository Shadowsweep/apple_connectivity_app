import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAlbums } from '../../hooks/useAlbums';

interface AddToAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaIds: string[];
  onAdd: (albumId: string) => void;
}

export const AddToAlbumModal: React.FC<AddToAlbumModalProps> = ({
  isOpen,
  onClose,
  mediaIds,
  onAdd,
}) => {
  const { data: albums } = useAlbums();
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlbumId) return;
    onAdd(selectedAlbumId);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='Add to Album'>
      <form onSubmit={handleSubmit} className='space-y-4'>
        <p className='text-xs text-[#A0A6B8]'>
          Adding {mediaIds.length} {mediaIds.length === 1 ? 'item' : 'items'} to an album.
        </p>
        <div>
          <label className='block text-xs font-medium text-[#A0A6B8] mb-2'>
            Select Destination Album
          </label>
          {albums && albums.length > 0 ? (
            <div className='space-y-2 max-h-60 overflow-y-auto'>
              {albums.map((album) => {
                const isSelected = selectedAlbumId === album.id;
                const rowClass = isSelected
                  ? 'bg-(--mm-accent)/15 border-(--mm-accent) text-white'
                  : 'bg-[#1A1D28] border-[#232736] text-[#A0A6B8] hover:text-white';
                return (
                  <label
                    key={album.id}
                    className={'flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ' + rowClass}
                  >
                    <div className='flex items-center gap-3'>
                      <input
                        type='radio'
                        name='album'
                        value={album.id}
                        checked={isSelected}
                        onChange={() => setSelectedAlbumId(album.id)}
                        className='text-(--mm-accent) focus:ring-0'
                      />
                      <span className='text-sm font-medium'>{album.name}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className='text-xs text-[#6B7280] py-4 text-center'>
              No albums created yet.
            </p>
          )}
        </div>

        <div className='flex justify-end gap-3 pt-4 border-t border-[#232736]'>
          <Button variant='secondary' type='button' onClick={onClose}>
            Cancel
          </Button>
          <Button variant='primary' type='submit' disabled={!selectedAlbumId}>
            Add Media
          </Button>
        </div>
      </form>
    </Modal>
  );
};
