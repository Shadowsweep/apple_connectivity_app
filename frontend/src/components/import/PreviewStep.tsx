import React, { useMemo } from 'react';
import { AlertTriangle, CheckSquare, Image, ShieldCheck, Square, Video } from '../icons';
import { ImportPreviewResponse } from '../../types/import';
import { formatBytes } from '../../utils/formatters';

interface PreviewStepProps {
  preview: ImportPreviewResponse | null;
  isLoading: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

const monthLabel = (key: string) => {
  if (key === 'unknown') return 'Unknown date';
  const parsed = new Date(`${key}-01T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? key
    : parsed.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

export const PreviewStep: React.FC<PreviewStepProps> = ({
  preview,
  isLoading,
  selectedIds,
  onSelectionChange,
}) => {
  const monthGroups = useMemo(() => {
    const groups = new Map<string, ImportPreviewResponse['items']>();
    for (const item of preview?.items || []) {
      const current = groups.get(item.month_key) || [];
      current.push(item);
      groups.set(item.month_key, current);
    }
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === 'unknown') return 1;
      if (b === 'unknown') return -1;
      return b.localeCompare(a);
    });
  }, [preview]);

  if (isLoading) {
    return (
      <div className='p-8 bg-[#1A1D28] rounded-2xl border border-[#232736] animate-pulse space-y-4'>
        <div className='h-4 bg-[#232736] rounded w-1/4' />
        <div className='h-8 bg-[#232736] rounded w-3/4' />
      </div>
    );
  }
  if (!preview) return null;

  const selectedItems = preview.items.filter((item) => selectedIds.has(item.id));
  const selectedBytes = selectedItems.reduce((sum, item) => sum + item.size_bytes, 0);
  const selectableItems = preview.items.filter((item) => !item.already_imported);

  const setMonthSelection = (monthKey: string, checked: boolean) => {
    const next = new Set(selectedIds);
    for (const item of preview.items) {
      if (item.month_key !== monthKey || item.already_imported) continue;
      if (checked) next.add(item.id);
      else next.delete(item.id);
    }
    onSelectionChange(next);
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3 className='text-sm font-semibold text-white'>3. Choose Photos & Videos by Month</h3>
          <p className='text-[11px] text-[#6B7280]'>Duplicates are shown but cannot be selected.</p>
        </div>
        <div className='flex gap-2'>
          <button
            className='text-[11px] text-(--mm-accent) hover:text-white'
            onClick={() => onSelectionChange(new Set(selectableItems.map((item) => item.id)))}
          >
            Select all
          </button>
          <span className='text-[#3B4052]'>·</span>
          <button className='text-[11px] text-[#A0A6B8] hover:text-white' onClick={() => onSelectionChange(new Set())}>
            Clear
          </button>
        </div>
      </div>

      <div className='bg-[#1A1D28] rounded-2xl border border-[#232736] overflow-hidden'>
        {monthGroups.map(([monthKey, items], index) => {
          const selectable = items.filter((item) => !item.already_imported);
          const selectedCount = selectable.filter((item) => selectedIds.has(item.id)).length;
          const allSelected = selectable.length > 0 && selectedCount === selectable.length;
          return (
            <details key={monthKey} open={index === 0} className='group border-b border-[#232736] last:border-b-0'>
              <summary className='list-none cursor-pointer px-4 py-3 flex items-center justify-between hover:bg-[#202431]'>
                <div className='flex items-center gap-3'>
                  <button
                    type='button'
                    aria-label={`Select ${monthLabel(monthKey)}`}
                    onClick={(event) => {
                      event.preventDefault();
                      setMonthSelection(monthKey, !allSelected);
                    }}
                    className='text-(--mm-accent)'
                  >
                    {allSelected ? <CheckSquare className='w-4 h-4' /> : <Square className='w-4 h-4' />}
                  </button>
                  <div>
                    <p className='text-xs font-semibold text-white'>{monthLabel(monthKey)}</p>
                    <p className='text-[10px] text-[#6B7280]'>{selectedCount} of {selectable.length} selected</p>
                  </div>
                </div>
                <span className='text-[11px] text-[#A0A6B8]'>{items.length} items · {formatBytes(items.reduce((sum, item) => sum + item.size_bytes, 0))}</span>
              </summary>
              <div className='divide-y divide-[#232736] bg-[#12141C] max-h-72 overflow-y-auto'>
                {items.map((item) => {
                  const checked = selectedIds.has(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`px-4 py-2.5 flex items-center gap-3 ${item.already_imported ? 'opacity-50' : 'cursor-pointer hover:bg-[#1A1D28]'}`}
                    >
                      <input
                        type='checkbox'
                        className='sr-only'
                        checked={checked}
                        disabled={item.already_imported}
                        onChange={() => {
                          const next = new Set(selectedIds);
                          if (checked) next.delete(item.id);
                          else next.add(item.id);
                          onSelectionChange(next);
                        }}
                      />
                      <span className={checked ? 'text-(--mm-accent)' : 'text-[#4C5265]'}>
                        {checked ? <CheckSquare className='w-4 h-4' /> : <Square className='w-4 h-4' />}
                      </span>
                      <span className='p-1.5 rounded-lg bg-[#202431] text-[#A0A6B8]'>
                        {item.media_type === 'VIDEO' ? <Video className='w-3.5 h-3.5' /> : <Image className='w-3.5 h-3.5' />}
                      </span>
                      <span className='min-w-0 flex-1'>
                        <span className='block text-xs text-white truncate'>{item.filename}</span>
                        <span className='block text-[10px] text-[#6B7280]'>
                          {item.capture_date ? new Date(item.capture_date).toLocaleDateString() : 'Date unavailable'} · {item.formatted_size}
                        </span>
                      </span>
                      {item.already_imported && <span className='text-[10px] text-[#FFB300]'>Already in vault</span>}
                    </label>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>

      <div className='bg-[#1A1D28] rounded-2xl p-5 border border-[#232736] space-y-4'>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
          <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736]'><span className='text-[11px] text-[#6B7280] block'>Selected</span><span className='text-lg font-bold text-white'>{selectedItems.length}</span></div>
          <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736]'><span className='text-[11px] text-[#6B7280] block'>Selected size</span><span className='text-lg font-bold text-white'>{formatBytes(selectedBytes)}</span></div>
          <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736]'><span className='text-[11px] text-[#6B7280] block'>Duplicates skipped</span><span className='text-lg font-bold text-[#FFB300]'>{preview.already_imported_count}</span></div>
          <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736]'><span className='text-[11px] text-[#6B7280] block'>Usable space</span><span className='text-lg font-bold text-(--mm-accent)'>{formatBytes(preview.usable_bytes)}</span></div>
        </div>
        <div className={'p-3 rounded-xl border flex items-start gap-3 ' + (preview.can_fit ? 'bg-[#00D68F]/10 border-[#00D68F]/30 text-[#00D68F]' : 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30]')}>
          {preview.can_fit ? <ShieldCheck className='w-5 h-5 flex-shrink-0' /> : <AlertTriangle className='w-5 h-5 flex-shrink-0' />}
          <p className='text-xs'>{preview.can_fit ? 'The current selection fits safely inside the vault reserve.' : 'This import would violate the configured disk safety reserve.'}</p>
        </div>
      </div>
    </div>
  );
};
