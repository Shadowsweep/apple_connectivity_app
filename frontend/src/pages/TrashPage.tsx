import React from 'react';
import { Trash2 } from 'lucide-react';
import { useMediaList } from '../hooks/useMedia';
import { MediaGrid } from '../components/media/MediaGrid';
import { Button } from '../components/common/Button';

export const TrashPage: React.FC = () => {
  const { data: trashedMedia, isLoading } = useMediaList({ status: 'TRASHED', limit: 100 });

  return (
    <div className='space-y-6 max-w-7xl mx-auto'>
      <div className='pb-4 border-b border-[#232736] flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-bold text-white flex items-center gap-2'>
            <Trash2 className='w-5 h-5 text-[#FF3B30]' /> Trash
          </h2>
          <p className='text-xs text-[#A0A6B8]'>
            Soft-deleted media items. These files are moved to the vault trash folder and can be restored.
          </p>
        </div>

        {trashedMedia && trashedMedia.count > 0 && (
          <Button variant='danger' size='sm'>
            Empty Trash
          </Button>
        )}
      </div>

      <MediaGrid items={trashedMedia?.items || []} isLoading={isLoading} />
    </div>
  );
};
