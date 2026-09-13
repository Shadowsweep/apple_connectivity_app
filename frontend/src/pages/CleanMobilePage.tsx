import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  CheckSquare,
  Square,
  Trash2,
  RefreshCw,
  History,
  Info,
  AlertTriangle,
  FileQuestion,
} from 'lucide-react';
import {
  useCleanStatus,
  useCleanScanResults,
  useTriggerCleanScan,
  useExecuteCleanup,
} from '../hooks/useCleanMobile';
import { CleanItem, CleanableStatus } from '../types/clean';
import { Button } from '../components/common/Button';
import { formatBytes } from '../utils/formatters';
import { CleanMobileReviewModal } from '../components/clean/CleanMobileReviewModal';
import { CleanConfirmationModal } from '../components/clean/CleanConfirmationModal';
import { CleanupHistoryModal } from '../components/clean/CleanupHistoryModal';

export const CleanMobilePage: React.FC = () => {
  const { data: deviceStatus } = useCleanStatus();
  const {
    data: scanResults,
    isLoading: isScanLoading,
    refetch: refetchScan,
  } = useCleanScanResults();

  const triggerScanMutation = useTriggerCleanScan();
  const executeCleanupMutation = useExecuteCleanup();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterTab, setFilterTab] = useState<'ALL' | CleanableStatus>('ALL');
  const [reviewItem, setReviewItem] = useState<CleanItem | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const items = scanResults?.items || [];
  const cleanableItems = items.filter((i) => i.status === 'CLEANABLE');

  const filteredItems = items.filter((i) => {
    if (filterTab === 'ALL') return true;
    return i.status === filterTab;
  });

  const toggleSelectAllCleanable = () => {
    if (selectedIds.size === cleanableItems.length && cleanableItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cleanableItems.map((i) => i.device_unique_id)));
    }
  };

  const toggleSelect = (item: CleanItem) => {
    if (item.status !== 'CLEANABLE') return;
    const next = new Set(selectedIds);
    if (next.has(item.device_unique_id)) {
      next.delete(item.device_unique_id);
    } else {
      next.add(item.device_unique_id);
    }
    setSelectedIds(next);
  };

  const selectedTotalBytes = cleanableItems
    .filter((i) => selectedIds.has(i.device_unique_id))
    .reduce((acc, curr) => acc + curr.device_size_bytes, 0);

  const handleRescan = () => {
    triggerScanMutation.mutate(undefined, {
      onSuccess: () => {
        refetchScan();
        setSelectedIds(new Set());
      },
    });
  };

  const handleExecuteConfirmed = () => {
    const targetIds = Array.from(selectedIds);
    executeCleanupMutation.mutate(targetIds, {
      onSuccess: () => {
        setIsConfirmOpen(false);
        setSelectedIds(new Set());
        refetchScan();
      },
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-[#232736] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#00D68F]" /> Clean Mobile Storage
          </h2>
          <p className="text-xs text-[#A0A6B8] mt-0.5">
            Identify media verified in your Windows vault and safely reclaim storage on your connected device.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={<History className="w-4 h-4" />}
            onClick={() => setIsHistoryOpen(true)}
          >
            Audit History
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-4 h-4 ${triggerScanMutation.isPending ? 'animate-spin' : ''}`} />}
            onClick={handleRescan}
            disabled={triggerScanMutation.isPending || isScanLoading}
          >
            {triggerScanMutation.isPending ? 'Scanning...' : 'Rescan Device'}
          </Button>

          {deviceStatus?.supports_delete !== false && (
            <Button
              variant="primary"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
              disabled={selectedIds.size === 0 || executeCleanupMutation.isPending}
              onClick={() => setIsConfirmOpen(true)}
            >
              {selectedIds.size > 0
                ? `Free Up ${formatBytes(selectedTotalBytes)}`
                : 'Select Items to Free Space'}
            </Button>
          )}
        </div>
      </div>

      {/* Device Connection Status Bar */}
      <div className="p-4 bg-[#1A1D28] border border-[#232736] rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-[#2E7CF6]/15 text-[#2E7CF6] rounded-xl">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">
                {deviceStatus?.name || 'Scanning for iPhone...'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  deviceStatus?.is_connected ? 'bg-[#00D68F]' : 'bg-red-500'
                }`}
              />
            </div>
            <span className="text-xs text-[#A0A6B8]">
              {deviceStatus?.is_connected
                ? deviceStatus?.supports_delete
                  ? 'Connected (Safe deletion supported)'
                  : 'Connected (Read-only mode — automated deletion disabled)'
                : 'Disconnected — please connect your device'}
            </span>
          </div>
        </div>

        {deviceStatus?.supports_delete === false && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
            <AlertTriangle className="w-4 h-4" />
            <span>Read-only device provider: manual report mode active</span>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#1A1D28] border border-[#232736] rounded-2xl space-y-1">
          <div className="text-xs text-[#A0A6B8] flex items-center justify-between">
            <span>Total On Device</span>
            <Smartphone className="w-4 h-4 text-[#A0A6B8]" />
          </div>
          <div className="text-2xl font-bold text-white">
            {scanResults?.total_device_media || 0}
          </div>
          <div className="text-[11px] text-[#6B7280]">Scanned device files</div>
        </div>

        <div className="p-4 bg-[#1A1D28] border border-[#00D68F]/30 rounded-2xl space-y-1">
          <div className="text-xs text-[#00D68F] flex items-center justify-between font-semibold">
            <span>Verified Cleanable</span>
            <ShieldCheck className="w-4 h-4 text-[#00D68F]" />
          </div>
          <div className="text-2xl font-bold text-[#00D68F]">
            {scanResults?.verified_cleanable_count || 0}
          </div>
          <div className="text-[11px] text-[#00D68F]/80">
            {formatBytes(scanResults?.total_reclaimable_bytes || 0)} reclaimable
          </div>
        </div>

        <div className="p-4 bg-[#1A1D28] border border-[#232736] rounded-2xl space-y-1">
          <div className="text-xs text-amber-400 flex items-center justify-between font-semibold">
            <span>Unverified Candidates</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {scanResults?.unverified_candidate_count || 0}
          </div>
          <div className="text-[11px] text-[#6B7280]">Size/hash mismatch — blocked</div>
        </div>

        <div className="p-4 bg-[#1A1D28] border border-[#232736] rounded-2xl space-y-1">
          <div className="text-xs text-[#A0A6B8] flex items-center justify-between">
            <span>Not Backed Up</span>
            <FileQuestion className="w-4 h-4 text-[#A0A6B8]" />
          </div>
          <div className="text-2xl font-bold text-white">
            {scanResults?.not_backed_up_count || 0}
          </div>
          <div className="text-[11px] text-[#6B7280]">Device-only media</div>
        </div>
      </div>

      {/* Safety Guarantee Banner */}
      <div className="p-4 bg-[#12141C] border border-[#232736] rounded-2xl flex items-start gap-3.5 text-xs text-[#A0A6B8]">
        <ShieldCheck className="w-5 h-5 text-[#00D68F] flex-shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <span className="font-semibold text-white block">Conservative Verification Guarantee</span>
          <span>
            MEMEASY guarantees zero local data loss. Candidates are classified as cleanable only after
            cryptographic SHA-256 hash match and verification that the local copy is active and intact.
            Selected files are removed strictly from the connected device.
          </span>
        </div>
      </div>

      {/* Filter Tabs and Selection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-[#1A1D28] border border-[#232736] rounded-xl text-xs">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              filterTab === 'ALL'
                ? 'bg-[#2E7CF6] text-white'
                : 'text-[#A0A6B8] hover:text-white'
            }`}
          >
            All Items ({items.length})
          </button>
          <button
            onClick={() => setFilterTab('CLEANABLE')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              filterTab === 'CLEANABLE'
                ? 'bg-[#00D68F]/20 text-[#00D68F]'
                : 'text-[#A0A6B8] hover:text-white'
            }`}
          >
            Cleanable ({cleanableItems.length})
          </button>
          <button
            onClick={() => setFilterTab('UNVERIFIED_CANDIDATE')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              filterTab === 'UNVERIFIED_CANDIDATE'
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-[#A0A6B8] hover:text-white'
            }`}
          >
            Unverified ({scanResults?.unverified_candidate_count || 0})
          </button>
          <button
            onClick={() => setFilterTab('NOT_BACKED_UP')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              filterTab === 'NOT_BACKED_UP'
                ? 'bg-[#232736] text-white'
                : 'text-[#A0A6B8] hover:text-white'
            }`}
          >
            Not Backed Up ({scanResults?.not_backed_up_count || 0})
          </button>
        </div>

        {cleanableItems.length > 0 && deviceStatus?.supports_delete !== false && (
          <Button
            variant="secondary"
            size="sm"
            icon={
              selectedIds.size === cleanableItems.length && cleanableItems.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-[#2E7CF6]" />
              ) : (
                <Square className="w-4 h-4" />
              )
            }
            onClick={toggleSelectAllCleanable}
          >
            {selectedIds.size === cleanableItems.length && cleanableItems.length > 0
              ? 'Deselect All Cleanable'
              : 'Select All Cleanable'}
          </Button>
        )}
      </div>

      {/* Media Items Table */}
      <div className="bg-[#1A1D28] border border-[#232736] rounded-2xl overflow-hidden">
        <div className="px-6 py-3 border-b border-[#232736] bg-[#12141C] flex items-center justify-between text-xs font-semibold text-[#6B7280]">
          <span className="w-1/2">DEVICE MEDIA ITEM</span>
          <div className="flex items-center gap-8 text-right">
            <span className="w-28 text-center">SAFETY STATUS</span>
            <span className="w-24">FILE SIZE</span>
            <span className="w-16 text-center">DETAILS</span>
          </div>
        </div>

        {isScanLoading ? (
          <div className="py-16 text-center text-xs text-[#6B7280]">Scanning connected device...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#6B7280] flex flex-col items-center gap-2">
            <ShieldCheck className="w-8 h-8 opacity-40 text-[#00D68F]" />
            <span>No media items found matching this filter.</span>
          </div>
        ) : (
          <div className="divide-y divide-[#232736] max-h-[500px] overflow-y-auto">
            {filteredItems.map((item) => {
              const isSelected = selectedIds.has(item.device_unique_id);
              const isCleanable = item.status === 'CLEANABLE';

              return (
                <div
                  key={item.device_unique_id}
                  onClick={() => isCleanable && toggleSelect(item)}
                  className={`px-6 py-3.5 flex items-center justify-between text-xs transition-colors ${
                    isCleanable ? 'cursor-pointer' : 'cursor-default opacity-80'
                  } ${isSelected ? 'bg-[#2E7CF6]/10' : 'hover:bg-[#12141C]'}`}
                >
                  <div className="flex items-center gap-3 w-1/2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!isCleanable || deviceStatus?.supports_delete === false}
                      onChange={() => {}}
                      className="rounded border-gray-600 text-[#2E7CF6] focus:ring-0 cursor-pointer disabled:opacity-30"
                    />
                    <div className="min-w-0">
                      <span className="font-medium text-white block truncate" title={item.filename}>
                        {item.filename}
                      </span>
                      <span
                        className="text-[10px] text-[#6B7280] font-mono block truncate"
                        title={item.source_path_str}
                      >
                        {item.source_path_str}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 text-right">
                    {/* Status Badge */}
                    <div className="w-28 text-center">
                      {item.status === 'CLEANABLE' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#00D68F]/15 text-[#00D68F] inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Cleanable
                        </span>
                      ) : item.status === 'UNVERIFIED_CANDIDATE' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-400 inline-flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> Unverified
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#232736] text-[#A0A6B8] inline-flex items-center gap-1">
                          <FileQuestion className="w-3 h-3" /> Device Only
                        </span>
                      )}
                    </div>

                    <span className="w-24 font-medium text-white">
                      {formatBytes(item.device_size_bytes)}
                    </span>

                    {/* Inspection Button */}
                    <div className="w-16 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReviewItem(item);
                        }}
                        className="p-1.5 text-[#A0A6B8] hover:text-white hover:bg-[#232736] rounded-lg transition-colors"
                        title="View Verification Details"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <CleanMobileReviewModal
        isOpen={!!reviewItem}
        onClose={() => setReviewItem(null)}
        item={reviewItem}
      />

      <CleanConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleExecuteConfirmed}
        count={selectedIds.size}
        totalBytes={selectedTotalBytes}
        deviceName={deviceStatus?.name || 'iPhone'}
        isExecuting={executeCleanupMutation.isPending}
      />

      <CleanupHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
};
