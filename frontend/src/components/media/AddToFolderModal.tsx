import React, { useState } from 'react';
import {
  Folder,
  FolderPlus,
  X,
  Search,
  Check,
  Loader2,
  AlertCircle,
  HardDrive,
  Plus,
} from '../icons';
import { Button } from '../common/Button';
import {
  useVaultFolders,
  useCreateVaultFolder,
  useMoveMediaToVaultFolder,
} from '../../hooks/useLibrary';

interface AddToFolderModalProps {
  isOpen: boolean;
  mediaIds: string[];
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddToFolderModal: React.FC<AddToFolderModalProps> = ({
  isOpen,
  mediaIds,
  onClose,
  onSuccess,
}) => {
  const { data: vaultData, isLoading: isFoldersLoading } = useVaultFolders();
  const createFolderMutation = useCreateVaultFolder();
  const moveMediaMutation = useMoveMediaToVaultFolder();

  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [filter, setFilter] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [copyMedia, setCopyMedia] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const folders = vaultData?.folders || [];
  const vaultRoot = vaultData?.vault_root || 'Current Vault';

  const visibleFolders = folders.filter((f) =>
    (f.relative_path || f.name).toLowerCase().includes(filter.toLowerCase())
  );

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    setError('');
    createFolderMutation.mutate(
      { name, parent: selectedFolder },
      {
        onSuccess: (newFolder) => {
          setSelectedFolder(newFolder.relative_path);
          setIsCreating(false);
          setNewFolderName('');
        },
        onError: (err: any) => {
          setError(err.message || 'Failed to create folder');
        },
      }
    );
  };

  const handleSave = () => {
    if (mediaIds.length === 0) return;
    setError('');
    moveMediaMutation.mutate(
      {
        mediaIds,
        targetFolder: selectedFolder,
        copyMedia,
      },
      {
        onSuccess: () => {
          if (onSuccess) onSuccess();
          onClose();
        },
        onError: (err: any) => {
          setError(err.message || 'Failed to move media');
        },
      }
    );
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200'>
      <div className='max-w-lg w-full bg-[#12141C] border border-[#232736] rounded-3xl p-6 shadow-2xl space-y-4'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className='p-2 rounded-xl bg-(--mm-accent)/10 text-(--mm-accent)'>
              <FolderPlus className='w-5 h-5' />
            </div>
            <div>
              <h3 className='text-sm font-bold text-white'>Add to Vault Folder</h3>
              <p className='text-[11px] text-[#A0A6B8]'>
                {mediaIds.length} item{mediaIds.length > 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='text-[#6B7280] hover:text-white transition-colors p-1 rounded-lg'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Vault info banner */}
        <div className='flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1A1D28] border border-[#232736] text-[11px] text-[#A0A6B8] font-mono truncate'>
          <HardDrive className='w-3.5 h-3.5 text-(--mm-accent) flex-shrink-0' />
          <span className='truncate'>{vaultRoot}</span>
        </div>

        {/* Search & Create New Folder Bar */}
        <div className='space-y-2'>
          <div className='flex gap-2'>
            <div className='flex flex-1 items-center gap-2 px-3 h-9 rounded-xl bg-[#1A1D28] border border-[#232736] focus-within:border-(--mm-accent) transition-colors'>
              <Search className='w-3.5 h-3.5 text-[#6B7280] flex-shrink-0' />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder='Filter vault folders...'
                className='flex-1 bg-transparent text-xs text-white placeholder-[#6B7280] focus:outline-none min-w-0'
              />
            </div>
            <Button
              variant='secondary'
              size='sm'
              icon={<Plus className='w-3.5 h-3.5' />}
              onClick={() => {
                setIsCreating(!isCreating);
                setError('');
              }}
            >
              New Folder
            </Button>
          </div>

          {/* New folder inline creator */}
          {isCreating && (
            <div className='p-3 rounded-xl bg-(--mm-accent)/10 border border-(--mm-accent)/30 space-y-2 animate-in fade-in duration-150'>
              <div className='text-[11px] font-medium text-white'>
                Create folder inside:{' '}
                <span className='font-mono text-(--mm-accent)'>
                  {selectedFolder ? selectedFolder : 'Vault Root'}
                </span>
              </div>
              <div className='flex gap-2'>
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  placeholder='Enter new folder name...'
                  className='flex-1 px-3 h-9 rounded-xl bg-[#12141C] border border-(--mm-accent) text-xs text-white placeholder-[#6B7280] focus:outline-none'
                />
                <Button
                  variant='primary'
                  size='sm'
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim() || createFolderMutation.isPending}
                >
                  {createFolderMutation.isPending ? (
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  ) : (
                    'Create'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className='flex items-center gap-2 p-2.5 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-xl text-[11px] text-[#FF3B30]'>
            <AlertCircle className='w-3.5 h-3.5 flex-shrink-0' /> {error}
          </div>
        )}

        {/* Folder list */}
        <div className='h-52 overflow-y-auto bg-[#1A1D28] rounded-xl border border-[#232736] divide-y divide-[#232736]'>
          {isFoldersLoading ? (
            <div className='h-full flex items-center justify-center text-[#6B7280] gap-2'>
              <Loader2 className='w-4 h-4 animate-spin' /> Loading folders...
            </div>
          ) : visibleFolders.length ? (
            visibleFolders.map((f) => {
              const isSelected = selectedFolder === f.relative_path;
              return (
                <button
                  key={f.relative_path}
                  onClick={() => {
                    setSelectedFolder(f.relative_path);
                    setError('');
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-(--mm-accent)/20 text-white font-semibold'
                      : 'text-[#A0A6B8] hover:text-white hover:bg-[#12141C]'
                  }`}
                >
                  <div className='flex items-center gap-2.5 truncate'>
                    <Folder
                      className={`w-4 h-4 flex-shrink-0 ${
                        isSelected ? 'text-(--mm-accent)' : 'text-[#FFB300]'
                      }`}
                    />
                    <span className='truncate'>
                      {f.relative_path ? f.relative_path : f.name}
                    </span>
                  </div>
                  {isSelected && <Check className='w-4 h-4 text-(--mm-accent) flex-shrink-0' />}
                </button>
              );
            })
          ) : (
            <div className='h-full flex items-center justify-center text-[11px] text-[#6B7280]'>
              No folders found
            </div>
          )}
        </div>

        {/* Options & Action Footer */}
        <div className='flex items-center justify-between pt-2 border-t border-[#232736]'>
          <label className='flex items-center gap-2 text-xs text-[#A0A6B8] cursor-pointer select-none'>
            <input
              type='checkbox'
              checked={copyMedia}
              onChange={(e) => setCopyMedia(e.target.checked)}
              className='rounded border-[#232736] bg-[#1A1D28] text-(--mm-accent) focus:ring-0'
            />
            <span>Keep original (copy instead of move)</span>
          </label>

          <div className='flex items-center gap-2'>
            <Button variant='secondary' size='sm' onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant='primary'
              size='sm'
              icon={<Check className='w-4 h-4' />}
              disabled={moveMediaMutation.isPending}
              onClick={handleSave}
            >
              {moveMediaMutation.isPending ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : copyMedia ? (
                'Copy to Folder'
              ) : (
                'Move to Folder'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
