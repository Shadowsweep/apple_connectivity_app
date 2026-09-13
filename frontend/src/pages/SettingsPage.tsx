import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Database,
  HardDrive,
  RefreshCw,
  CheckCircle,
  Activity,
  ShieldCheck,
  PieChart,
  ArrowRight,
  Download,
  FileCheck,
  Save,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useLibraryInfo, useHealth, useTriggerIndex, useTriggerRebuild } from '../hooks/useLibrary';
import { useLibraryHealth, useScanHealth, useIndexUnindexed } from '../hooks/useLibraryHealth';
import {
  useDatabaseIntegrity,
  useDiagnosticsReport,
  useBackupDatabase,
  useRestoreDatabase,
  useCleanupThumbnails,
} from '../hooks/useDiagnostics';
import { diagnosticsApi } from '../api/diagnosticsApi';
import { Button } from '../components/common/Button';
import { formatBytes } from '../utils/formatters';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: lib } = useLibraryInfo();
  const { data: health } = useHealth();
  const { data: libHealth } = useLibraryHealth();
  const { data: dbIntegrity, refetch: refetchIntegrity, isFetching: isCheckingIntegrity } = useDatabaseIntegrity();
  const { data: diagnostics, refetch: refetchDiagnostics } = useDiagnosticsReport();

  const triggerIndexMutation = useTriggerIndex();
  const triggerRebuildMutation = useTriggerRebuild();
  const scanHealthMutation = useScanHealth();
  const indexUnindexedMutation = useIndexUnindexed();
  const backupDbMutation = useBackupDatabase();
  const restoreDbMutation = useRestoreDatabase();
  const cleanupThumbsMutation = useCleanupThumbnails();

  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const handleExportDiagnostics = async () => {
    try {
      const data = await diagnosticsApi.exportDiagnostics();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memeasy-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export diagnostics payload.');
    }
  };

  const handleBackup = () => {
    backupDbMutation.mutate(undefined, {
      onSuccess: (res) => {
        setBackupMessage(`Backup saved: ${res.backup_path} (${formatBytes(res.size_bytes)})`);
      },
    });
  };

  const handleRestore = () => {
    if (confirm('Restore SQLite database from the latest .db.bak backup snapshot?')) {
      restoreDbMutation.mutate(undefined, {
        onSuccess: () => {
          alert('Database restored successfully from backup.');
          refetchIntegrity();
        },
      });
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#232736]">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#2E7CF6]" /> Library Settings & Diagnostics
          </h2>
          <p className="text-xs text-[#A0A6B8]">
            Manage local vault directory, SQLite integrity, online backups, and reliability diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportDiagnostics}
          >
            Export Diagnostics
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<PieChart className="w-3.5 h-3.5 text-[#2E7CF6]" />}
            onClick={() => navigate('/storage')}
          >
            Storage Intelligence <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Library Health & Integrity Monitor */}
      <div className="bg-[#1A1D28] rounded-2xl p-6 border border-[#232736] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                libHealth?.is_healthy ? 'bg-[#00D68F]/15 text-[#00D68F]' : 'bg-[#FFB300]/15 text-[#FFB300]'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                Library Integrity Status
                {libHealth?.is_healthy ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00D68F]/20 text-[#00D68F] border border-[#00D68F]/30">
                    Healthy
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFB300]/20 text-[#FFB300] border border-[#FFB300]/30">
                    Attention Needed
                  </span>
                )}
              </h4>
              <p className="text-xs text-[#A0A6B8]">
                Automatic verification between filesystem media and SQLite catalog records.
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${scanHealthMutation.isPending ? 'animate-spin' : ''}`} />}
            disabled={scanHealthMutation.isPending}
            onClick={() => scanHealthMutation.mutate()}
          >
            {scanHealthMutation.isPending ? 'Scanning...' : 'Verify Integrity'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#232736] text-xs">
          <div className="p-3 bg-[#12141C] rounded-xl border border-[#232736]">
            <span className="text-[#6B7280] block text-[11px] mb-1">Active Verified Files</span>
            <span className="text-white font-bold">{libHealth?.total_active || lib?.total_media_count || 0} items</span>
          </div>

          <div className="p-3 bg-[#12141C] rounded-xl border border-[#232736]">
            <span className="text-[#6B7280] block text-[11px] mb-1">Missing Files (Deleted on Disk)</span>
            <span className={`font-bold ${libHealth && libHealth.missing_count > 0 ? 'text-red-400' : 'text-[#00D68F]'}`}>
              {libHealth?.missing_count || 0} files
            </span>
          </div>

          <div className="p-3 bg-[#12141C] rounded-xl border border-[#232736] flex items-center justify-between">
            <div>
              <span className="text-[#6B7280] block text-[11px] mb-1">Unindexed Files on Disk</span>
              <span className={`font-bold ${libHealth && libHealth.unindexed_count > 0 ? 'text-[#FFB300]' : 'text-[#00D68F]'}`}>
                {libHealth?.unindexed_count || 0} files
              </span>
            </div>
            {libHealth && libHealth.unindexed_count > 0 && (
              <button
                onClick={() => indexUnindexedMutation.mutate()}
                disabled={indexUnindexedMutation.isPending}
                className="text-[10px] bg-[#2E7CF6] text-white px-2.5 py-1 rounded-lg font-bold hover:bg-[#2566c7] transition-colors"
              >
                Index Now
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Database Reliability & Backup */}
      <div className="bg-[#1A1D28] rounded-2xl p-6 border border-[#232736] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#00D68F]/15 text-[#00D68F]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                SQLite Reliability & Backups
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  dbIntegrity?.is_healthy ? 'bg-[#00D68F]/20 text-[#00D68F]' : 'bg-red-500/20 text-red-400'
                }`}>
                  {dbIntegrity?.is_healthy ? 'PRAGMA: OK' : 'PRAGMA: Error'}
                </span>
              </h4>
              <p className="text-xs text-[#A0A6B8]">
                WAL journal mode, foreign key constraints, and point-in-time online backups (.db.bak).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              icon={<FileCheck className={`w-3.5 h-3.5 ${isCheckingIntegrity ? 'animate-spin' : ''}`} />}
              disabled={isCheckingIntegrity}
              onClick={() => refetchIntegrity()}
            >
              {isCheckingIntegrity ? 'Checking...' : 'Check DB'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<Save className="w-3.5 h-3.5" />}
              disabled={backupDbMutation.isPending}
              onClick={handleBackup}
            >
              {backupDbMutation.isPending ? 'Backing up...' : 'Backup DB'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              disabled={restoreDbMutation.isPending}
              onClick={handleRestore}
            >
              Restore
            </Button>
          </div>
        </div>

        {backupMessage && (
          <div className="p-3 bg-[#00D68F]/10 border border-[#00D68F]/20 rounded-xl text-xs text-[#00D68F]">
            {backupMessage}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-[#232736] text-xs">
          <div>
            <span className="text-[#6B7280] block text-[11px]">Database Size</span>
            <span className="font-semibold text-white">{formatBytes(dbIntegrity?.size_bytes || 0)}</span>
          </div>
          <div>
            <span className="text-[#6B7280] block text-[11px]">Journal Mode</span>
            <span className="font-semibold text-[#00D68F]">WAL (Write-Ahead Logging)</span>
          </div>
          <div>
            <span className="text-[#6B7280] block text-[11px]">Integrity Check Result</span>
            <span className="font-mono text-[#A0A6B8] truncate block">
              {dbIntegrity?.messages?.[0] || 'ok'}
            </span>
          </div>
        </div>
      </div>

      {/* Thumbnail Cache Maintenance */}
      <div className="bg-[#1A1D28] rounded-2xl p-6 border border-[#232736] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Thumbnail Cache Maintenance</h4>
              <p className="text-xs text-[#A0A6B8]">
                Disk-cached thumbnails ({diagnostics?.thumbnail_cache_files || 0} files,{' '}
                {formatBytes(diagnostics?.thumbnail_cache_bytes || 0)}).
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            disabled={cleanupThumbsMutation.isPending}
            onClick={() =>
              cleanupThumbsMutation.mutate(undefined, {
                onSuccess: (r) => alert(`Pruned ${r.pruned_count} orphaned thumbnails.`),
              })
            }
          >
            {cleanupThumbsMutation.isPending ? 'Cleaning...' : 'Prune Orphan Thumbnails'}
          </Button>
        </div>
      </div>

      {/* Storage Path Card */}
      <div className="bg-[#1A1D28] rounded-2xl p-6 border border-[#232736] space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#2E7CF6]/15 text-[#2E7CF6]">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Active Library Root</h4>
            <p className="text-xs font-mono text-[#A0A6B8]">{lib?.root_path || 'Loading...'}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#232736] text-xs">
          <div>
            <span className="text-[#6B7280] block text-[11px]">Total Vault Size</span>
            <span className="font-semibold text-white">{lib ? formatBytes(lib.total_bytes - lib.free_bytes) : '...'}</span>
          </div>
          <div>
            <span className="text-[#6B7280] block text-[11px]">Free Usable Disk</span>
            <span className="font-semibold text-[#00D68F]">{lib?.formatted_usable || '...'}</span>
          </div>
          <div>
            <span className="text-[#6B7280] block text-[11px]">Safety Reserve</span>
            <span className="font-semibold text-[#FFB300]">10.0 GB Reserve</span>
          </div>
        </div>
      </div>

      {/* Index Management */}
      <div className="bg-[#1A1D28] rounded-2xl p-6 border border-[#232736] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#00D68F]/15 text-[#00D68F]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">SQLite Catalog Index</h4>
              <p className="text-xs text-[#A0A6B8]">
                Full index rebuild creates an automatic backup (.db.bak) before re-indexing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              disabled={triggerIndexMutation.isPending}
              onClick={() => triggerIndexMutation.mutate()}
            >
              {triggerIndexMutation.isPending ? 'Indexing...' : 'Incremental Index'}
            </Button>

            <Button
              variant="danger"
              size="sm"
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
      <div className="bg-[#1A1D28] rounded-2xl p-6 border border-[#232736] space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Backend Service Health</h4>
            <p className="text-xs text-[#A0A6B8]">Local FastAPI daemon status and connectivity.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-[#12141C] rounded-xl border border-[#232736]">
            <span className="text-[#6B7280] block text-[11px] mb-1">API Status</span>
            <span className="text-[#00D68F] font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> {health?.status || 'Active'}
            </span>
          </div>
          <div className="p-3 bg-[#12141C] rounded-xl border border-[#232736]">
            <span className="text-[#6B7280] block text-[11px] mb-1">Service</span>
            <span className="text-white font-bold">{health?.service || 'MEMEASY'}</span>
          </div>
          <div className="p-3 bg-[#12141C] rounded-xl border border-[#232736]">
            <span className="text-[#6B7280] block text-[11px] mb-1">Database</span>
            <span className="text-white font-bold">{health?.database || 'WAL Active'}</span>
          </div>
          <div className="p-3 bg-[#12141C] rounded-xl border border-[#232736]">
            <span className="text-[#6B7280] block text-[11px] mb-1">Active Locks</span>
            <span className="text-white font-bold">
              {Object.keys(diagnostics?.active_locks || {}).length} locks
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
