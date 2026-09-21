import React, { useEffect, useState } from 'react';
import { HardDrive, Folder, ArrowLeft, Check, Loader2, X, Search, Plus, AlertCircle, Download } from '../icons';
import { Button } from './Button';
import { fsApi, FsBrowseResponse } from '../../api/fsApi';

interface FolderBrowserModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath?: string;
}

export const FolderBrowserModal: React.FC<FolderBrowserModalProps> = ({
  open,
  onClose,
  onSelect,
  initialPath,
}) => {
  const [state, setState] = useState<FsBrowseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const load = (path: string) => {
    setLoading(true);
    setError('');
    fsApi.browse(path)
      .then(setState)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    setFilter('');
    setCreating(false);
    setNewName('');
    load(initialPath || '');
  }, [open, initialPath]);

  const go = (path: string) => {
    setFilter('');
    setCreating(false);
    load(path);
  };

  const createFolder = async () => {
    if (!state?.current || !newName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const r = await fsApi.mkdir(state.current, newName.trim());
      setState(r);
      setCreating(false);
      setNewName('');
    } catch (e: any) {
      setError(e.message || 'Could not create folder');
    } finally {
      setLoading(false);
    }
  };

  const createDatedImportFolder = async () => {
    // ponytail: one-click "Imports/<today>" destination — the 90% case for imports
    if (!state?.current) return;
    setLoading(true);
    setError('');
    const today = new Date().toISOString().slice(0, 10);
    try {
      let r = await fsApi.browse(state.current);
      if (!r.entries.some((e) => e.name === 'Imports')) {
        r = await fsApi.mkdir(state.current, 'Imports');
      }
      const importsDir = r.entries.find((e) => e.name === 'Imports');
      if (!importsDir) throw new Error('Could not locate Imports folder');
      r = await fsApi.mkdir(importsDir.path, today);
      setState(r);
    } catch (e: any) {
      setError(e.message || 'Could not create import folder');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const crumbs = state?.current ? state.current.split('\\').filter(Boolean) : [];
  const visibleEntries = state?.entries.filter((e) =>
    e.name.toLowerCase().includes(filter.toLowerCase())
  ) ?? [];

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200'>
      <div className='max-w-lg w-full bg-[#12141C] border border-[#232736] rounded-3xl p-6 shadow-2xl space-y-4'>
        <div className='flex items-center justify-between'>
          <h3 className='text-sm font-bold text-white flex items-center gap-2'>
            <Folder className='w-4 h-4 text-[#FFB300]' /> Choose Folder
          </h3>
          <button onClick={onClose} className='text-[#6B7280] hover:text-white transition-colors'>
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Drive picker */}
        <div className='flex items-center gap-2 flex-wrap p-2.5 bg-[#1A1D28] rounded-xl border border-[#232736] min-h-[38px]'>
          {state?.drives.map((d) => (
            <button
              key={d}
              onClick={() => go(d)}
              className={'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-mono transition-colors ' +
                (state.current === d
                  ? 'bg-(--mm-accent) text-white'
                  : 'bg-[#12141C] text-[#A0A6B8] hover:text-white border border-[#232736]')}
            >
              <HardDrive className='w-3 h-3' /> {d}
            </button>
          ))}
        </div>

        {state?.current && (
          <div className='flex items-center gap-2 text-[11px] font-mono text-[#A0A6B8] px-1'>
            {state.parent !== null && state.parent !== state.current && (
              <button onClick={() => go(state.parent!)} className='p-1.5 rounded-lg bg-[#1A1D28] border border-[#232736] hover:text-white transition-colors'>
                <ArrowLeft className='w-3.5 h-3.5' />
              </button>
            )}
            <span className='truncate text-[#6B7280]'>
              {crumbs.map((c, i) => (
                <span key={i}>{c}{i < crumbs.length - 1 && <span className='text-[#30354A]'> {'>'} </span>}</span>
              ))}
            </span>
          </div>
        )}

        {/* Search + New Folder */}
        {state?.current && (
          <button
            onClick={createDatedImportFolder}
            disabled={loading}
            className='w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-(--mm-accent)/10 border border-(--mm-accent)/30 text-xs text-white hover:bg-(--mm-accent)/20 transition-colors'
          >
            <span className='p-1.5 rounded-lg bg-(--mm-accent)/20 text-(--mm-accent)'>
              <Download className='w-3.5 h-3.5' />
            </span>
            <span className='flex-1 text-left'>
              <span className='font-medium block'>Quick import destination</span>
              <span className='text-[10px] text-[#A0A6B8]'>
                Creates <span className='font-mono'>Imports\{new Date().toISOString().slice(0, 10)}</span> here and selects it
              </span>
            </span>
            <Plus className='w-3.5 h-3.5 text-(--mm-accent)' />
          </button>
        )}

        {state?.current && (
          <div className='flex gap-2'>
            <div className='flex flex-1 items-center gap-2 px-3 h-9 rounded-xl bg-[#12141C] border border-[#232736] focus-within:border-(--mm-accent) transition-colors'>
              <Search className='w-3.5 h-3.5 text-[#6B7280] flex-shrink-0' />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder='Filter folders...'
                className='flex-1 bg-transparent text-xs text-white placeholder-[#6B7280] focus:outline-none min-w-0'
              />
            </div>
            {creating ? (
              <div className='flex gap-2'>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                  placeholder='Folder name'
                  className='w-36 px-3 h-9 rounded-xl bg-[#12141C] border border-(--mm-accent) text-xs text-white placeholder-[#6B7280] focus:outline-none'
                />
                <button
                  onClick={createFolder}
                  disabled={!newName.trim() || loading}
                  className='px-3 h-9 rounded-xl bg-(--mm-accent) text-white text-xs font-semibold hover:bg-(--mm-accent-hover) disabled:opacity-50 transition-colors'
                >
                  Create
                </button>
                <button
                  onClick={() => { setCreating(false); setNewName(''); setError(''); }}
                  className='px-2 h-9 rounded-xl bg-[#1A1D28] border border-[#232736] text-[#A0A6B8] hover:text-white transition-colors'
                >
                  <X className='w-3.5 h-3.5' />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                title='New folder here'
                className='w-9 h-9 flex items-center justify-center rounded-xl bg-[#1A1D28] border border-[#232736] text-[#A0A6B8] hover:text-white hover:border-(--mm-accent)/50 transition-all flex-shrink-0'
              >
                <Plus className='w-4 h-4' />
              </button>
            )}
          </div>
        )}

        {error && (
          <div className='flex items-center gap-2 p-2.5 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-xl text-[11px] text-[#FF3B30]'>
            <AlertCircle className='w-3.5 h-3.5 flex-shrink-0' /> {error}
          </div>
        )}

        {/* Folder list */}
        <div className='h-64 overflow-y-auto bg-[#1A1D28] rounded-xl border border-[#232736] divide-y divide-[#232736]'>
          {loading ? (
            <div className='h-full flex items-center justify-center text-[#6B7280]'>
              <Loader2 className='w-5 h-5 animate-spin' />
            </div>
          ) : visibleEntries.length ? (
            visibleEntries.map((e) => (
              <button
                key={e.path}
                onClick={() => go(e.path)}
                className='w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-xs text-[#A0A6B8] hover:text-white hover:bg-[#12141C] transition-colors'
              >
                <Folder className='w-4 h-4 text-(--mm-accent) flex-shrink-0' />
                <span className='truncate'>{e.name}</span>
              </button>
            ))
          ) : (
            <div className='h-full flex items-center justify-center text-[11px] text-[#6B7280]'>
              {filter ? 'No folders match your filter' : 'No subfolders — select this folder'}
            </div>
          )}
        </div>

        <div className='flex items-center justify-between pt-1'>
          <span className='text-[10px] font-mono text-[#6B7280] truncate max-w-[280px]'>
            {state?.current || 'Select a drive above'}
          </span>
          <Button
            variant='primary'
            icon={<Check className='w-4 h-4' />}
            disabled={!state?.current || loading}
            onClick={() => {
              if (state?.current) {
                onSelect(state.current);
                onClose();
              }
            }}
          >
            Use This Folder
          </Button>
        </div>
      </div>
    </div>
  );
};
