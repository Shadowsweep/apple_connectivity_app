import React from 'react';
import { Trash2 } from '../components/icons';
import { useMediaList } from '../hooks/useMedia';
import { MediaGrid } from '../components/media/MediaGrid';

export const TrashPage: React.FC = () => {
  const { data: trashedMedia, isLoading } = useMediaList({ status: 'TRASHED', limit: 100 });

  return (
    <div className='space-y-6 max-w-7xl mx-auto'>
      <div className='pb-4 border-b border-[#232736]'>
        <h2 className='text-lg font-bold text-white flex items-center gap-2'>
          <Trash2 className='w-5 h-5 text-[#FF3B30]' /> Trash
        </h2>
        <p className='text-xs text-[#A0A6B8]'>
          Soft-deleted media items. Files stay on disk and can be restored by re-indexing.
        </p>
      </div>

      <MediaGrid items={trashedMedia?.items || []} isLoading={isLoading} />
    </div>
  );
};
