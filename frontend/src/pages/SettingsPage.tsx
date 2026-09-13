import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Database, HardDrive, RefreshCw, CheckCircle, Activity, ShieldCheck, AlertTriangle, PieChart, ArrowRight } from 'lucide-react';
import { useLibraryInfo, useHealth, useTriggerIndex, useTriggerRebuild } from '../hooks/useLibrary';
import { useLibraryHealth, useScanHealth, useIndexUnindexed } from '../hooks/useLibraryHealth';
import { Button } from '../components/common/Button';
import { formatBytes } from '../utils/formatters';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: lib } = useLibraryInfo();
  const { data: health } = useHealth();
  const { data: libHealth, isLoading: isHealthLoading } = useLibraryHealth();
  
  const triggerIndexMutation = useTriggerIndex();
  const triggerRebuildMutation = useTriggerRebuild();
  const scanHealthMutation = useScanHealth();
  const indexUnindexedMutation = useIndexUnindexed();

  return (
    <div className='space-y-8 max-w-4xl mx-auto pb-12'>
      <div className='flex items-center justify-between pb-4 border-b border-[#232736]'>
        <div>
          <h2 className='text-lg font-bold text-white flex items-center gap-2'>
            <Settings className='w-5 h-5 text-[#2E7CF6]' /> Library Settings & Diagnostics
          </h2>
          <p className='text-xs text-[#A0A6B8]'>
            Manage local vault directory, database indexing, and verify system integrity.
          </p>
        </div>

        <Button
          variant='secondary'
          size='sm'
          icon={<PieChart className='w-3.5 h-3.5 text-[#2E7CF6]' />}
          onClick={() => navigate('/storage')}
        >
          Storage Intelligence <ArrowRight className='w-3.5 h-3.5' />
        </Button>
      </div>

      {/* Library Health & Integrity Monitor */}
      <div className='bg-[#1A1D28] rounded-2xl p-6 border border-[#232736] space-y-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className={`p-2.5 rounded-xl ${libHealth?.is_healthy ? 'bg-[#00D68F]/15 text-[#00D68F]' : 'bg-[#FFB300]/15 text-[#FFB300]'}`}>
              <ShieldCheck className='w-5 h-5' />
            </div>
            <div>
              <h4 className='text-sm font-semibold text-white flex items-center gap-2'>
                Library Integrity Status
                {libHealth?.is_healthy ? (
                  <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00D68F]/20 text-[#00D68F] border border-[#00D68F]/30'>
                    Healthy
                  </span>
                ) : (
                  <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFB300]/20 text-[#FFB300] border border-[#FFB300]/30'>
                    Attention Needed
                  </span>
                )}
              </h4>
              <p className='text-xs text-[#A0A6B8]'>
                Automatic verification between filesystem media and SQLite catalog records.
              </p>
            </div>
          </div>

          <Button
            variant='secondary'
            size='sm'
            icon={<RefreshCw className={`w-3.5 h-3.5 ${scanHealthMutation.isPending ? 'animate-spin' : ''}`} />}
            disabled={scanHealthMutation.isPending}
            onClick={() => scanHealthMutation.mutate()}
          >
            {scanHealthMutation.isPending ? 'Scanning...' : 'Verify Integrity'}
          </Button>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#232736] text-xs'>
          <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736]'>
            <span className='text-[#6B7280] block text-[11px] mb-1'>Active Verified Files</span>
            <span className='text-white font-bold'>{libHealth?.total_active || lib?.total_media_count || 0} items</span>
          </div>

          <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736]'>
            <span className='text-[#6B7280] block text-[11px] mb-1'>Missing Files (Deleted on Disk)</span>
            <span className={`font-bold ${libHealth && libHealth.missing_count > 0 ? 'text-red-400' : 'text-[#00D68F]'}`}>
              {libHealth?.missing_count || 0} files
            </span>
          </div>

          <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736] flex items-center justify-between'>
            <div>
              <span className='text-[#6B7280] block text-[11px] mb-1'>Unindexed Files on Disk</span>
              <span className={`font-bold ${libHealth && libHealth.unindexed_count > 0 ? 'text-[#FFB300]' : 'text-[#00D68F]'}`}>
                {libHealth?.unindexed_count || 0} files
              </span>
            </div>
            {libHealth && libHealth.unindexed_count > 0 && (
              <button
                onClick={() => indexUnindexedMutation.mutate()}
                disabled={indexUnindexedMutation.isPending}
                className='text-[10px] bg-[#2E7CF6] text-white px-2.5 py-1 rounded-lg font-bold hover:bg-[#2566c7] transition-colors'
              >
                Index Now
              </button>
            )}
          </div>
        </div>
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

