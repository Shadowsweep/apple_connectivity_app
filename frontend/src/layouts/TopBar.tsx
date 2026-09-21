import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Sparkles, Search, Plus, FolderHeart, HardDrive, ChevronRight } from '../components/icons';
import { SearchModal } from '../components/common/SearchModal';
import { CreateAlbumModal } from '../components/album/CreateAlbumModal';
import { MediaViewer } from '../components/media/MediaViewer';
import { MediaRecord } from '../types/media';
import { useCreateAlbum } from '../hooks/useAlbums';

interface TopBarProps {
  title?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title }) => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState('');
  const [plusOpen, setPlusOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [inspectingMedia, setInspectingMedia] = useState<MediaRecord | null>(null);
  const plusRef = useRef<HTMLDivElement>(null);
  const createAlbumMutation = useCreateAlbum();

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (plusRef.current && !plusRef.current.contains(e.target as Node)) setPlusOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const quickActions = [
    {
      label: 'New Album',
      hint: 'Collection',
      icon: <FolderHeart className='w-4 h-4 text-(--mm-accent)' />,
      action: () => setIsCreateOpen(true),
    },
    {
      label: 'Import Media',
      hint: 'From device',
      icon: <Download className='w-4 h-4 text-[#00D68F]' />,
      action: () => navigate('/import'),
    },
    {
      label: 'Index Folder',
      hint: 'Scan to vault',
      icon: <HardDrive className='w-4 h-4 text-[#FFB300]' />,
      action: () => navigate('/import'),
    },
  ];

  return (
    <header className='h-16 border-b border-[#232736] px-8 flex items-center justify-between bg-[#090A0F]/80 backdrop-blur-md sticky top-0 z-30'>
      <div className='flex items-center gap-5 flex-1 max-w-2xl'>
        <h2 className='text-lg font-semibold text-white tracking-tight whitespace-nowrap'>
          {title || 'Media Vault'}
        </h2>

        {/* Live Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setIsSearchOpen(true);
          }}
          className='hidden sm:flex flex-1 items-center gap-2.5 px-3.5 h-9 rounded-xl bg-[#12141C] border border-[#232736] focus-within:border-(--mm-accent) transition-colors'
        >
          <Search className='w-4 h-4 text-[#6B7280] flex-shrink-0' />
          <input
            value={draftQuery}
            onChange={(e) => {
              setDraftQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder='Search your vault...'
            className='flex-1 bg-transparent text-xs text-white placeholder-[#6B7280] focus:outline-none min-w-0'
          />
          {draftQuery ? (
            <button type='button' onClick={() => setDraftQuery('')} className='text-[#6B7280] hover:text-white text-[10px]'>
              Clear
            </button>
          ) : (
            <kbd className='px-1.5 py-0.5 rounded bg-[#1A1D28] border border-[#232736] text-[10px] font-mono text-[#6B7280]'>
              Ctrl K
            </kbd>
          )}
        </form>
      </div>

      <div className='flex items-center gap-3'>
        {/* Quick Create */}
        <div ref={plusRef} className='relative'>
          <button
            onClick={() => setPlusOpen((o) => !o)}
            title='Quick create'
            className='w-9 h-9 flex items-center justify-center rounded-xl bg-(--mm-accent) text-white hover:bg-(--mm-accent-hover) shadow-md shadow-(--mm-accent)/25 transition-colors'
          >
            <Plus className={'w-4.5 h-4.5 transition-transform duration-200 ' + (plusOpen ? 'rotate-45' : '')} />
          </button>

          {plusOpen && (
            <div className='absolute right-0 top-11 w-52 bg-[#12141C] border border-[#232736] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150'>
              <div className='px-4 pt-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]'>
                Create
              </div>
              {quickActions.map(({ label, hint, icon, action }) => (
                <button
                  key={label}
                  onClick={() => {
                    setPlusOpen(false);
                    action();
                  }}
                  className='w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#1A1D28] group transition-colors'
                >
                  <span className='p-1.5 rounded-lg bg-[#1A1D28] border border-[#232736] group-hover:border-(--mm-accent)/40 transition-colors'>
                    {icon}
                  </span>
                  <span className='flex-1'>
                    <span className='block text-xs font-medium text-white'>{label}</span>
                    <span className='block text-[10px] text-[#6B7280]'>{hint}</span>
                  </span>
                  <ChevronRight className='w-3.5 h-3.5 text-[#30354A] group-hover:text-(--mm-accent) transition-colors' />
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/clean')}
          className='hidden md:flex items-center gap-2 px-3.5 h-9 rounded-xl bg-[#1A1D28] border border-[#232736] text-xs font-medium text-[#A0A6B8] hover:text-white hover:border-[#00D68F]/40 transition-all'
        >
          <Sparkles className='w-3.5 h-3.5 text-[#00D68F]' /> Clean
        </button>

        <button
          onClick={() => navigate('/import')}
          className='flex items-center gap-2 px-3.5 h-9 rounded-xl bg-(--mm-accent) text-white text-xs font-semibold hover:bg-(--mm-accent-hover) shadow-md shadow-(--mm-accent)/25 transition-colors'
        >
          <Download className='w-3.5 h-3.5' /> Import
        </button>
      </div>

      <SearchModal
        isOpen={isSearchOpen}
        initialQuery={draftQuery}
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

      <CreateAlbumModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={(name, desc) => createAlbumMutation.mutate({ name, description: desc })}
      />

      <MediaViewer
        media={inspectingMedia}
        isOpen={!!inspectingMedia}
        onClose={() => setInspectingMedia(null)}
      />
    </header>
  );
};
