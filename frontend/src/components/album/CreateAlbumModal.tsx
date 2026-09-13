import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface CreateAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => void;
  isLoading?: boolean;
}

export const CreateAlbumModal: React.FC<CreateAlbumModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), desc.trim() || undefined);
    setName('');
    setDesc('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='Create Virtual Album'>
      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label className='block text-xs font-medium text-[#A0A6B8] mb-1.5'>
            Album Name *
          </label>
          <input
            type='text'
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g., Summer Vacation 2025'
            className='w-full px-3.5 py-2 rounded-lg bg-[#1A1D28] border border-[#232736] text-white text-sm focus:outline-none focus:border-[#2E7CF6]'
          />
        </div>

        <div>
          <label className='block text-xs font-medium text-[#A0A6B8] mb-1.5'>
            Description (Optional)
          </label>
          <textarea
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder='Short description of this collection...'
            className='w-full px-3.5 py-2 rounded-lg bg-[#1A1D28] border border-[#232736] text-white text-sm focus:outline-none focus:border-[#2E7CF6]'
          />
        </div>

        <div className='flex justify-end gap-3 pt-4 border-t border-[#232736]'>
          <Button variant='secondary' type='button' onClick={onClose}>
            Cancel
          </Button>
          <Button variant='primary' type='submit' disabled={!name.trim() || isLoading}>
            Create Album
          </Button>
        </div>
      </form>
    </Modal>
  );
};
