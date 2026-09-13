import React from 'react';
import { Settings, Database, HardDrive, RefreshCw, CheckCircle, Activity } from 'lucide-react';
import { useLibraryInfo, useHealth, useTriggerIndex, useTriggerRebuild } from '../hooks/useLibrary';
import { Button } from '../components/common/Button';
import { formatBytes } from '../utils/formatters';

export const SettingsPage: React.FC = () => {
  const { data: lib } = useLibraryInfo();
  const { data: health } = useHealth();
  const triggerIndexMutation = useTriggerIndex();
  const triggerRebuildMutation = useTriggerRebuild();

  return (
    <div className='space-y-8 max-w-4xl mx-auto'>
      <div className='pb-4 border-b border-[#232736]'>
        <h2 className='text-lg font-bold text-white flex items-center gap-2'>
          <Settings className='w-5 h-5 text-[#2E7CF6]' /> Library Settings & Diagnostics
        </h2>
        <p className='text-xs text-[#A0A6B8]'>
          Manage local vault directory, database indexing, and verify system service health.
        </p>
      </div>

      {/* Storage Path Card */}
      <div className='bg-[#1A1D28] rounded-2xl p-6 border border-[#232736] space-y-4'>
        <div className='flex items-center gap-3'>
          <div className='p-2.5 rounded-xl bg-[#2E7CF6]/15 text-[#2E7CF6]'>
            <HardDrive className='w-5 h-5' />
          </div>
          <div>
            <h4 className='text-sm font-semibold text-white'>Active Library Root</h4>
            <p className='text-xs font-mono text-[#A0A6B8]'>{lib?.root_path || 'Loading...'}</p>
          </div>
        </div>

        <div className='grid grid-cols-3 gap-3 pt-3 border-t border-[#232736] text-xs'>
          <div>
            <span className='text-[#6B7280] block text-[11px]'>Total Vault Size</span>
            <span className='font-semibold text-white'>{lib ? formatBytes(lib.total_bytes - lib.free_bytes) : '...'}</span>
          </div>
          <div>
            <span className='text-[#6B7280] block text-[11px]'>Free Usable Disk</span>
            <span className='font-semibold text-[#00D68F]'>{lib?.formatted_usable || '...'}</span>
          </div>
          <div>
            <span className='text-[#6B7280] block text-[11px]'>Safety Reserve</span>
            <span className='font-semibold text-[#FFB300]'>10.0 GB Reserve</span>
          </div>
        </div>
      </div>

      {/* Index Management */}
      <div className='bg-[#1A1D28] rounded-2xl p-6 border border-[#232736] space-y-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='p-2.5 rounded-xl bg-[#00D68F]/15 text-[#00D68F]'>
              <Database className='w-5 h-5' />
            </div>
            <div>
              <h4 className='text-sm font-semibold text-white'>SQLite Catalog Index</h4>
              <p className='text-xs text-[#A0A6B8]'>
                Fast metadata catalog with WAL journal mode. Rescans filesystem for unindexed media.
              </p>
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <Button
              variant='secondary'
              size='sm'
              icon={<RefreshCw className='w-3.5 h-3.5' />}
              disabled={triggerIndexMutation.isPending}
              onClick={() => triggerIndexMutation.mutate()}
            >
              {triggerIndexMutation.isPending ? 'Indexing...' : 'Incremental Index'}
            </Button>

            <Button
              variant='danger'
              size='sm'
              disabled={triggerRebuildMutation.isPending}
              onClick={() => {
                if (confirm('Rebuild full SQLite index? A backup (.db.bak) will be created automatically.')) {
                  triggerRebuildMutation.mutate();
                }
              }}
            >
              {triggerRebuildMutation.isPending ? 'Rebuilding...' : 'Rebuild Index'}
            </Button>
          </div>
        </div>
      </div>

      {/* Health Diagnostics */}
      <div className='bg-[#1A1D28] rounded-2xl p-6 border border-[#232736] space-y-4'>
        <div className='flex items-center gap-3 mb-2'>
          <div className='p-2.5 rounded-xl bg-purple-500/15 text-purple-400'>
            <Activity className='w-5 h-5' />
          </div>
          <div>
            <h4 className='text-sm font-semibold text-white'>Backend Service Health</h4>
            <p className='text-xs text-[#A0A6B8]'>Local FastAPI daemon status and connectivity.</p>
          </div>
        </div>

        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs'>
          <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736]'>
            <span className='text-[#6B7280] block text-[11px] mb-1'>API Status</span>
            <span className='text-[#00D68F] font-bold flex items-center gap-1'>
              <CheckCircle className='w-3.5 h-3.5' /> {health?.status || 'Active'}
            </span>
          </div>
          <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736]'>
            <span className='text-[#6B7280] block text-[11px] mb-1'>Service</span>
            <span className='text-white font-bold'>{health?.service || 'MEMEASY'}</span>
          </div>
          <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736]'>
            <span className='text-[#6B7280] block text-[11px] mb-1'>Database</span>
            <span className='text-white font-bold'>{health?.database || 'WAL Active'}</span>
          </div>
          <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736]'>
            <span className='text-[#6B7280] block text-[11px] mb-1'>Port</span>
            <span className='text-white font-bold'>8000</span>
          </div>
        </div>
      </div>
    </div>
  );
};
