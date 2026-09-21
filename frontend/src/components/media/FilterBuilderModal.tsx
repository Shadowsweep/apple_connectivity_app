import React, { useState } from 'react';
import { X, Filter, Bookmark, Check, RotateCcw } from '../icons';
import { MediaFilters } from '../../types/filters';
import { Button } from '../common/Button';
import { useCreateSavedSearch } from '../../hooks/useSavedSearches';

interface FilterBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: MediaFilters;
  onApplyFilters: (filters: MediaFilters) => void;
}

export const FilterBuilderModal: React.FC<FilterBuilderModalProps> = ({
  isOpen,
  onClose,
  filters: initialFilters,
  onApplyFilters,
}) => {
  const [draft, setDraft] = useState<MediaFilters>(initialFilters);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const createSearchMutation = useCreateSavedSearch();

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyFilters(draft);
    onClose();
  };

  const handleReset = () => {
    const empty: MediaFilters = { sort: 'newest' };
    setDraft(empty);
    onApplyFilters(empty);
    onClose();
  };

  const handleSaveSearch = () => {
    if (!saveSearchName.trim()) return;
    createSearchMutation.mutate(
      {
        name: saveSearchName.trim(),
        query: draft,
      },
      {
        onSuccess: () => {
          setSavedSuccess(true);
          setTimeout(() => {
            setSavedSuccess(false);
            setShowSaveInput(false);
            setSaveSearchName('');
          }, 1500);
        },
      }
    );
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm'>
      <div className='w-full max-w-xl bg-[#12141C] border border-[#232736] rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto'>
        {/* Header */}
        <div className='flex items-center justify-between pb-4 border-b border-[#232736]'>
          <div className='flex items-center gap-2'>
            <Filter className='w-5 h-5 text-(--mm-accent)' />
            <h3 className='text-base font-bold text-white'>Advanced Query Builder</h3>
          </div>
          <button
            onClick={onClose}
            className='p-1.5 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#1A1D28]'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Filter Form Controls */}
        <div className='space-y-4 text-xs'>
          {/* Media Type */}
          <div className='space-y-1.5'>
            <label className='text-[#A0A6B8] font-medium'>Media Type</label>
            <div className='grid grid-cols-5 gap-2'>
              {(['ALL', 'PHOTO', 'VIDEO', 'SCREENSHOT', 'LIVE_PHOTO'] as const).map((t) => (
                <button
                  key={t}
                  type='button'
                  onClick={() => setDraft({ ...draft, mediaType: t === 'ALL' ? undefined : t })}
                  className={`py-2 px-1 rounded-xl font-semibold border text-center transition-all ${
                    (draft.mediaType || 'ALL') === t || (!draft.mediaType && t === 'ALL')
                      ? 'bg-(--mm-accent) text-white border-(--mm-accent)'
                      : 'bg-[#1A1D28] text-[#A0A6B8] border-[#232736] hover:text-white'
                  }`}
                >
                  {t === 'ALL' ? 'All' : t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Capture Date Range */}
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <label className='text-[#A0A6B8] font-medium'>Captured After</label>
              <input
                type='date'
                value={draft.startDate || ''}
                onChange={(e) => setDraft({ ...draft, startDate: e.target.value || undefined })}
                className='w-full bg-[#1A1D28] border border-[#232736] rounded-xl px-3 py-2 text-white outline-none focus:border-(--mm-accent)'
              />
            </div>
            <div className='space-y-1.5'>
              <label className='text-[#A0A6B8] font-medium'>Captured Before</label>
              <input
                type='date'
                value={draft.endDate || ''}
                onChange={(e) => setDraft({ ...draft, endDate: e.target.value || undefined })}
                className='w-full bg-[#1A1D28] border border-[#232736] rounded-xl px-3 py-2 text-white outline-none focus:border-(--mm-accent)'
              />
            </div>
          </div>

          {/* File Size Range (MB) */}
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <label className='text-[#A0A6B8] font-medium'>Min Size (MB)</label>
              <input
                type='number'
                placeholder='e.g. 50'
                value={draft.minSize ? Math.round(draft.minSize / (1024 * 1024)) : ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    minSize: e.target.value ? parseInt(e.target.value, 10) * 1024 * 1024 : undefined,
                  })
                }
                className='w-full bg-[#1A1D28] border border-[#232736] rounded-xl px-3 py-2 text-white outline-none focus:border-(--mm-accent)'
              />
            </div>
            <div className='space-y-1.5'>
              <label className='text-[#A0A6B8] font-medium'>Max Size (MB)</label>
              <input
                type='number'
                placeholder='e.g. 2000'
                value={draft.maxSize ? Math.round(draft.maxSize / (1024 * 1024)) : ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    maxSize: e.target.value ? parseInt(e.target.value, 10) * 1024 * 1024 : undefined,
                  })
                }
                className='w-full bg-[#1A1D28] border border-[#232736] rounded-xl px-3 py-2 text-white outline-none focus:border-(--mm-accent)'
              />
            </div>
          </div>

          {/* Min Resolution (4K / 1080p shortcut) */}
          <div className='space-y-1.5'>
            <label className='text-[#A0A6B8] font-medium'>Min Resolution (Width × Height)</label>
            <div className='grid grid-cols-2 gap-3'>
              <input
                type='number'
                placeholder='Min Width (e.g. 3840)'
                value={draft.minWidth || ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    minWidth: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                className='w-full bg-[#1A1D28] border border-[#232736] rounded-xl px-3 py-2 text-white outline-none focus:border-(--mm-accent)'
              />
              <input
                type='number'
                placeholder='Min Height (e.g. 2160)'
                value={draft.minHeight || ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    minHeight: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                className='w-full bg-[#1A1D28] border border-[#232736] rounded-xl px-3 py-2 text-white outline-none focus:border-(--mm-accent)'
              />
            </div>
          </div>

          {/* Extension & Sort */}
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <label className='text-[#A0A6B8] font-medium'>File Format</label>
              <select
                value={draft.extension || ''}
                onChange={(e) => setDraft({ ...draft, extension: e.target.value || undefined })}
                className='w-full bg-[#1A1D28] border border-[#232736] rounded-xl px-3 py-2 text-white outline-none focus:border-(--mm-accent)'
              >
                <option value=''>Any Extension</option>
                <option value='heic'>HEIC (Apple Photo)</option>
                <option value='jpg'>JPG / JPEG</option>
                <option value='png'>PNG</option>
                <option value='mov'>MOV (QuickTime)</option>
                <option value='mp4'>MP4 Video</option>
              </select>
            </div>
            <div className='space-y-1.5'>
              <label className='text-[#A0A6B8] font-medium'>Sort Order</label>
              <select
                value={draft.sort || 'newest'}
                onChange={(e) => setDraft({ ...draft, sort: e.target.value as any })}
                className='w-full bg-[#1A1D28] border border-[#232736] rounded-xl px-3 py-2 text-white outline-none focus:border-(--mm-accent)'
              >
                <option value='newest'>Capture Date (Newest first)</option>
                <option value='oldest'>Capture Date (Oldest first)</option>
                <option value='imported_newest'>Import Date (Newest first)</option>
                <option value='size_desc'>File Size (Largest first)</option>
                <option value='size_asc'>File Size (Smallest first)</option>
                <option value='duration_desc'>Duration (Longest first)</option>
                <option value='name_asc'>Filename (A → Z)</option>
              </select>
            </div>
          </div>

          {/* Favorites Filter */}
          <div className='pt-1'>
            <label className='flex items-center gap-2 cursor-pointer'>
              <input
                type='checkbox'
                checked={draft.favorite === true}
                onChange={(e) =>
                  setDraft({ ...draft, favorite: e.target.checked ? true : undefined })
                }
                className='rounded border-[#232736] bg-[#1A1D28] text-(--mm-accent) focus:ring-0 w-4 h-4'
              />
              <span className='text-[#A0A6B8] font-medium'>Starred Favorites Only</span>
            </label>
          </div>
        </div>

        {/* Save as Saved Search Section */}
        <div className='pt-2 border-t border-[#232736] space-y-2'>
          {!showSaveInput ? (
            <button
              type='button'
              onClick={() => setShowSaveInput(true)}
              className='text-xs text-(--mm-accent) hover:underline flex items-center gap-1.5'
            >
              <Bookmark className='w-3.5 h-3.5' /> Save this query as Smart Search...
            </button>
          ) : (
            <div className='flex items-center gap-2'>
              <input
                type='text'
                placeholder='Search Name (e.g. 4K Videos)'
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                className='flex-1 bg-[#1A1D28] border border-[#232736] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-(--mm-accent)'
              />
              <Button
                variant='primary'
                size='sm'
                onClick={handleSaveSearch}
                disabled={!saveSearchName.trim() || createSearchMutation.isPending}
              >
                {savedSuccess ? <Check className='w-3.5 h-3.5 text-[#00D68F]' /> : 'Save'}
              </Button>
              <Button variant='ghost' size='sm' onClick={() => setShowSaveInput(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className='flex items-center justify-between pt-4 border-t border-[#232736]'>
          <Button
            variant='ghost'
            size='sm'
            icon={<RotateCcw className='w-3.5 h-3.5' />}
            onClick={handleReset}
          >
            Reset Filters
          </Button>

          <div className='flex items-center gap-2'>
            <Button variant='secondary' size='sm' onClick={onClose}>
              Cancel
            </Button>
            <Button variant='primary' size='sm' onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
