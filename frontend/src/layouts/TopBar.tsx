import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Sparkles, Search } from 'lucide-react';
import { Button } from '../components/common/Button';
import { SearchModal } from '../components/common/SearchModal';
import { MediaViewer } from '../components/media/MediaViewer';
import { MediaRecord } from '../types/media';

interface TopBarProps {
  title?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title }) => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [inspectingMedia, setInspectingMedia] = useState<MediaRecord | null>(null);

  return (
    <header className='h-16 border-b border-[#232736] px-8 flex items-center justify-between bg-[#090A0F]/80 backdrop-blur-md sticky top-0 z-30'>
      <div className='flex items-center gap-6'>
        <h2 className='text-lg font-semibold text-white tracking-tight'>
          {title || 'Media Vault'}
        </h2>

        {/* Global Search Bar Trigger */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className='hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-[#1A1D28]/80 hover:bg-[#1A1D28] border border-[#232736] text-xs text-[#A0A6B8] hover:text-white transition-all shadow-inner w-64 justify-between group'
        >
          <div className='flex items-center gap-2'>
            <Search className='w-3.5 h-3.5 text-[#6B7280] group-hover:text-[#2E7CF6] transition-colors' />
            <span>Search library...</span>
          </div>
          <kbd className='px-1.5 py-0.5 rounded bg-[#090A0F] border border-[#232736] text-[10px] font-mono text-[#6B7280]'>
            Ctrl K
          </kbd>
        </button>
      </div>

      <div className='flex items-center gap-3'>
        <Button
          variant='secondary'
          size='sm'
          icon={<Sparkles className='w-3.5 h-3.5 text-[#00D68F]' />}
          onClick={() => navigate('/clean')}
        >
          Clean Mobile
        </Button>

        <Button
          variant='primary'
          size='sm'
          icon={<Download className='w-3.5 h-3.5' />}
          onClick={() => navigate('/import')}
        >
          Import iPhone
        </Button>
      </div>

      {/* Global Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectMedia={(media) => {
          setIsSearchOpen(false);
          setInspectingMedia(media);
        }}
        onSelectAlbum={(album) => {
          setIsSearchOpen(false);
          navigate(`/albums/${album.id}`);
        }}
      />

      {/* Media Viewer for Search Selection */}
      <MediaViewer
        media={inspectingMedia}
        isOpen={!!inspectingMedia}
        onClose={() => setInspectingMedia(null)}
      />
    </header>
  );
};
