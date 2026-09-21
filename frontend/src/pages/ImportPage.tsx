import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DeviceSelector } from '../components/import/DeviceSelector';
import { DeviceSummaryPanel } from '../components/import/DeviceSummaryPanel';
import { FilterStep } from '../components/import/FilterStep';
import { PreviewStep } from '../components/import/PreviewStep';
import { JobProgress } from '../components/import/JobProgress';
import { Button } from '../components/common/Button';
import {
  useImportPreview,
  useStartImport,
  useJobStatus,
  useDeviceSummary,
  useScanStatus,
  useStartScan,
} from '../hooks/useImport';
import { importApi } from '../api/importApi';
import { ImportFilterParams } from '../types/import';
import { FolderPlus, Layers, Play, RefreshCw } from '../components/icons';
import { useCreateVaultFolder, useVaultFolders } from '../hooks/useLibrary';
import { useAlbums } from '../hooks/useAlbums';

export const ImportPage: React.FC = () => {
  const [deviceType, setDeviceType] = useState<'iphone' | 'local'>('iphone');
  const [customPath, setCustomPath] = useState('');
  const [filters, setFilters] = useState<ImportFilterParams>({});
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetFolder, setTargetFolder] = useState('');
  const [groupName, setGroupName] = useState('');

  const { data: deviceSummary, isLoading: isSummaryLoading, refetch: refetchSummary } = useDeviceSummary();
  const { data: scanStatus } = useScanStatus(deviceType === 'iphone');
  const startScanMutation = useStartScan();
  const { data: vaultData } = useVaultFolders();
  const createFolderMutation = useCreateVaultFolder();
  const { data: albums } = useAlbums();

  const importParams: ImportFilterParams = useMemo(() => ({
    ...filters,
    source_path: deviceType === 'local' ? customPath : undefined,
  }), [filters, deviceType, customPath]);

  const {
    data: preview,
    isLoading: isPreviewLoading,
    refetch: refetchPreview,
    error: previewError,
  } = useImportPreview(
    importParams,
    deviceType === 'local' ? Boolean(customPath.trim()) : deviceSummary?.connection_status === 'READY'
  );

  const startImportMutation = useStartImport();
  const { data: currentJob } = useJobStatus(activeJobId);

  useEffect(() => {
    if (!preview?.items?.length) {
      setSelectedIds(new Set());
      return;
    }
    // ponytail: select non-duplicate items in the latest month by default to avoid accidental 33GB bulk imports
    const firstMonthKey = preview.items[0]?.month_key;
    const initialSelection = preview.items
      .filter((item) => item.month_key === firstMonthKey && !item.already_imported)
      .map((item) => item.id);
    setSelectedIds(new Set(initialSelection));
  }, [preview]);

  const handleStartImport = async () => {
    try {
      const res = await startImportMutation.mutateAsync({
        ...importParams,
        selected_ids: [...selectedIds],
        target_folder: targetFolder || undefined,
        group_name: groupName.trim() || undefined,
      });
      setActiveJobId(res.job_id);
    } catch (err: any) {
      alert(err.message || 'Failed to start import job');
    }
  };

  const handleScan = async () => {
    // ponytail: background DEVICE_SCAN job keeps the UI responsive during the ~28s USB enumeration
    if (deviceType === 'iphone') {
      const started = await startScanMutation.mutateAsync(true);
      if (!started.reused_cache && started.job_id) {
        for (let i = 0; i < 300; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          const s = await importApi.getScanStatus();
          if (s.state === 'COMPLETED' || s.state === 'FAILED' || s.state === 'CANCELLED') break;
        }
      }
      await refetchSummary();
    }
    await refetchPreview();
  };

  // Refresh summary and preview whenever a background scan finishes
  useEffect(() => {
    if (scanStatus?.state === 'COMPLETED') {
      refetchSummary();
      refetchPreview();
    }
  }, [scanStatus?.state, refetchSummary, refetchPreview]);

  // ponytail: one auto-scan per mount only when needed
  const autoScanStarted = useRef(false);
  useEffect(() => {
    if (autoScanStarted.current || isSummaryLoading) return;
    if (deviceType === 'iphone' && deviceSummary?.connection_status === 'SCANNING') return;
    if (deviceType === 'iphone' && (!deviceSummary || deviceSummary.connection_status === 'DISCONNECTED')) {
      if (!scanStatus || scanStatus.state === 'IDLE') {
        autoScanStarted.current = true;
        handleScan().catch(() => {
          autoScanStarted.current = false;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSummaryLoading, deviceSummary, scanStatus, deviceType]);

  const handleCreateFolder = () => {
    const name = window.prompt('Name the new folder inside the selected vault folder:');
    if (!name?.trim()) return;
    createFolderMutation.mutate(
      { name: name.trim(), parent: targetFolder },
      { onSuccess: (folder) => setTargetFolder(folder.relative_path) }
    );
  };

  return (
    <div className='space-y-8 max-w-4xl mx-auto'>
      <div className='pb-4 border-b border-[#232736] flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-bold text-white'>iPhone Import Wizard</h2>
          <p className='text-xs text-[#A0A6B8]'>
            Safe 2-pass import engine: discovery, SHA-256 integrity verification, 10 GB reserve safety guard.
          </p>
        </div>

        {!activeJobId && (
          <Button
            variant='secondary'
            size='sm'
            icon={<RefreshCw className={'w-3.5 h-3.5' + (scanStatus?.state === 'SCANNING' || startScanMutation.isPending ? ' animate-spin' : '')} />}
            onClick={handleScan}
            disabled={isPreviewLoading || startScanMutation.isPending || scanStatus?.state === 'SCANNING'}
          >
            {scanStatus?.state === 'SCANNING'
              ? `Scanning… ${scanStatus.items_discovered.toLocaleString()} items`
              : 'Scan Device'}
          </Button>
        )}
      </div>

      {activeJobId ? (
        <JobProgress job={currentJob || null} onReset={() => setActiveJobId(null)} />
      ) : (
        <div className='space-y-8'>
          {deviceType === 'iphone' && (
            <DeviceSummaryPanel
              summary={deviceSummary || null}
              isLoading={isSummaryLoading}
              onRefresh={handleScan}
              isRefreshing={startScanMutation.isPending || scanStatus?.state === 'SCANNING'}
              scanState={scanStatus?.state ?? null}
              scannedItems={scanStatus?.items_discovered ?? 0}
            />
          )}

          <DeviceSelector
            deviceType={deviceType}
            onSelectDeviceType={setDeviceType}
            customPath={customPath}
            onCustomPathChange={setCustomPath}
            deviceSummary={deviceSummary}
          />

          <FilterStep filters={filters} onChange={setFilters} />

          {previewError && (
            <div className='p-3 rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-xs text-[#FF6B63]'>
              {(previewError as Error).message}
            </div>
          )}

          <PreviewStep
            preview={preview || null}
            isLoading={isPreviewLoading}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />

          {preview && (
            <div className='space-y-4'>
              <h3 className='text-sm font-semibold text-white'>4. Choose Vault Folder & Group</h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#1A1D28] p-5 rounded-2xl border border-[#232736]'>
                <div>
                  <label className='block text-xs font-medium text-[#A0A6B8] mb-2'>Vault destination</label>
                  <div className='flex gap-2'>
                    <select
                      value={targetFolder}
                      onChange={(event) => setTargetFolder(event.target.value)}
                      className='min-w-0 flex-1 px-3 py-2 rounded-lg bg-[#12141C] border border-[#232736] text-white text-xs focus:outline-none focus:border-(--mm-accent)'
                    >
                      {(vaultData?.folders || [{ name: 'Root (Vault)', relative_path: '' }]).map((folder) => (
                        <option key={folder.relative_path} value={folder.relative_path}>
                          {folder.relative_path || folder.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleCreateFolder}
                      disabled={createFolderMutation.isPending}
                      className='px-3 rounded-lg border border-[#232736] text-[#A0A6B8] hover:text-white hover:border-(--mm-accent) disabled:opacity-50'
                      title='Create folder'
                    >
                      <FolderPlus className='w-4 h-4' />
                    </button>
                  </div>
                  <p className='text-[10px] text-[#6B7280] mt-1.5'>Media stays organized into Photos/Videos and year/month beneath this folder.</p>
                </div>

                <div>
                  <label className='text-xs font-medium text-[#A0A6B8] mb-2 flex items-center gap-1.5'>
                    <Layers className='w-3.5 h-3.5 text-(--mm-accent)' /> Group / album (optional)
                  </label>
                  <input
                    list='memeasy-import-groups'
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                    placeholder='e.g. Goa Trip'
                    maxLength={120}
                    className='w-full px-3 py-2 rounded-lg bg-[#12141C] border border-[#232736] text-white text-xs focus:outline-none focus:border-(--mm-accent)'
                  />
                  <datalist id='memeasy-import-groups'>
                    {(albums || []).map((album) => <option key={album.id} value={album.name} />)}
                  </datalist>
                  <p className='text-[10px] text-[#6B7280] mt-1.5'>A matching group is reused; a new one is created after a successful import.</p>
                </div>
              </div>
            </div>
          )}

          <div className='flex justify-end pt-4 border-t border-[#232736]'>
            <Button
              variant='primary'
              size='lg'
              icon={<Play className='w-4 h-4 fill-white' />}
              disabled={
                isPreviewLoading ||
                !preview ||
                !preview.can_fit ||
                selectedIds.size === 0 ||
                startImportMutation.isPending
              }
              onClick={handleStartImport}
            >
              {startImportMutation.isPending ? 'Starting...' : `Import ${selectedIds.size} Selected Items`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
