import React, { useState } from 'react';
import { Copy, Trash2, CheckCircle, RefreshCw, AlertTriangle, ShieldCheck, HardDrive } from '../components/icons';
import { useDuplicates, useTrashDuplicates, useScanDuplicates } from '../hooks/useDuplicates';
import { formatBytes, formatDate } from '../utils/formatters';
import { Button } from '../components/common/Button';
import { mediaApi } from '../api/mediaApi';
import { MediaViewer } from '../components/media/MediaViewer';
import { MediaRecord } from '../types/media';

export const DuplicatesPage: React.FC = () => {
  const { data: groups, isLoading } = useDuplicates();
  const trashMutation = useTrashDuplicates();
  const scanMutation = useScanDuplicates();

  // Map of groupId (hash) -> keptMediaId
  const [keptSelections, setKeptSelections] = useState<Record<string, string>>({});
  const [inspectingMedia, setInspectingMedia] = useState<MediaRecord | null>(null);

  if (isLoading) {
    return (
      <div className='p-12 text-center text-xs text-[#A0A6B8]'>
        Analyzing cryptographic duplicates...
      </div>
    );
  }

  // Calculate redundant copies to trash based on user's "Keep" selection
  const duplicateList = groups || [];
  const selectedToTrash: string[] = [];
  let potentialReclaimedBytes = 0;

  duplicateList.forEach((group) => {
    const keepId = keptSelections[group.hash_sha256] || group.items[0].id;
    group.items.forEach((item) => {
      if (item.id !== keepId) {
        selectedToTrash.push(item.id);
        potentialReclaimedBytes += item.size_bytes;
      }
    });
  });

  const handleKeepSelect = (hash: string, mediaId: string) => {
    setKeptSelections((prev) => ({ ...prev, [hash]: mediaId }));
  };

  const handleTrashRedundant = () => {
    if (selectedToTrash.length === 0) return;
    trashMutation.mutate(selectedToTrash);
  };

  return (
    <div className='space-y-8 max-w-7xl mx-auto pb-12'>
      {/* Header */}
      <div className='flex items-center justify-between pb-4 border-b border-[#232736]'>
        <div>
          <h2 className='text-xl font-bold text-white flex items-center gap-2'>
            <Copy className='w-5 h-5 text-(--mm-accent)' /> Duplicate Intelligence & Review
          </h2>
          <p className='text-xs text-[#A0A6B8]'>
            Exact cryptographic SHA-256 matches. Review copies safely before moving redundant files to Trash.
          </p>
        </div>

        <div className='flex items-center gap-3'>
          <Button
            variant='secondary'
            size='sm'
            icon={<RefreshCw className={`w-3.5 h-3.5 ${scanMutation.isPending ? 'animate-spin' : ''}`} />}
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
          >
            Scan Duplicates
          </Button>

          {selectedToTrash.length > 0 && (
            <Button
              variant='danger'
              size='sm'
              icon={<Trash2 className='w-3.5 h-3.5' />}
              onClick={handleTrashRedundant}
              disabled={trashMutation.isPending}
            >
              Trash {selectedToTrash.length} Redundant Copies ({formatBytes(potentialReclaimedBytes)})
            </Button>
          )}
        </div>
      </div>

      {/* Safety Notice */}
      <div className='p-4 bg-[#1A1D28] rounded-2xl border border-[#232736] flex items-center gap-3.5'>
        <div className='p-2.5 rounded-xl bg-[#00D68F]/15 text-[#00D68F]'>
          <ShieldCheck className='w-5 h-5' />
        </div>
        <div className='text-xs'>
          <h4 className='font-bold text-white'>Zero Risk of Data Loss</h4>
          <p className='text-[#A0A6B8]'>
            MEMEASY will keep your selected primary copy intact and soft-delete duplicate copies to the Trash folder where they can be restored at any time.
          </p>
        </div>
      </div>

      {/* Duplicate Groups List */}
      {duplicateList.length === 0 ? (
        <div className='p-16 text-center space-y-3 bg-[#1A1D28]/40 rounded-3xl border border-[#232736]'>
          <CheckCircle className='w-10 h-10 text-[#00D68F] mx-auto' />
          <h3 className='text-base font-bold text-white'>No Duplicates Detected</h3>
          <p className='text-xs text-[#A0A6B8] max-w-md mx-auto'>
            Your media library is completely clean and deduplicated. Every photo and video has a unique cryptographic identity.
          </p>
        </div>
      ) : (
        <div className='space-y-6'>
          {duplicateList.map((group, gIdx) => {
            const currentKeepId = keptSelections[group.hash_sha256] || group.items[0].id;

            return (
              <div
                key={group.hash_sha256}
                className='p-6 bg-[#1A1D28] rounded-2xl border border-[#232736] space-y-4 shadow-lg'
              >
                {/* Group Sub-Header */}
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <span className='px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-(--mm-accent)/20 text-(--mm-accent) border border-(--mm-accent)/30'>
                      Group #{gIdx + 1}
                    </span>
                    <span className='text-xs font-bold text-white'>
                      {group.count} Identical Copies ({formatBytes(group.size_bytes)} each)
                    </span>
                  </div>

                  <span className='text-[11px] font-mono text-[#6B7280] hidden sm:block'>
                    SHA: {group.hash_sha256.slice(0, 16)}...
                  </span>
                </div>

                {/* Copies Grid */}
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {group.items.map((item) => {
                    const isKept = item.id === currentKeepId;
                    const thumbUrl = mediaApi.getStreamUrl(item.id);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleKeepSelect(group.hash_sha256, item.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-3 relative ${
                          isKept
                            ? 'bg-(--mm-accent)/10 border-(--mm-accent) shadow-md shadow-(--mm-accent)/10'
                            : 'bg-[#12141C] border-[#232736] hover:border-[#30354A] opacity-75 hover:opacity-100'
                        }`}
                      >
                        {/* Radio Selection Badge */}
                        <div className='flex items-center justify-between'>
                          <label className='flex items-center gap-2 cursor-pointer text-xs font-bold'>
                            <input
                              type='radio'
                              name={`group-${group.hash_sha256}`}
                              checked={isKept}
                              onChange={() => handleKeepSelect(group.hash_sha256, item.id)}
                              className='text-(--mm-accent) focus:ring-0'
                            />
                            <span className={isKept ? 'text-(--mm-accent)' : 'text-[#6B7280]'}>
                              {isKept ? '✓ Keep this copy' : 'Mark to trash'}
                            </span>
                          </label>

                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectingMedia(item);
                            }}
                            className='text-[10px] text-[#A0A6B8] hover:text-white underline'
                          >
                            Preview
                          </button>
                        </div>

                        {/* Thumbnail preview */}
                        <div className='w-full h-32 rounded-lg bg-[#090A0F] overflow-hidden relative'>
                          <img
                            src={thumbUrl}
                            alt={item.filename}
                            className='w-full h-full object-cover'
                          />
                        </div>

                        {/* File Details */}
                        <div className='space-y-1 text-xs'>
                          <p className='font-bold text-white truncate' title={item.filename}>
                            {item.filename}
                          </p>
                          <p className='text-[10px] text-[#6B7280] font-mono truncate' title={item.relative_path}>
                            {item.relative_path}
                          </p>
                          <p className='text-[10px] text-[#A0A6B8]'>
                            Imported: {formatDate(item.imported_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Viewer */}
      <MediaViewer
        media={inspectingMedia}
        isOpen={!!inspectingMedia}
        onClose={() => setInspectingMedia(null)}
      />
    </div>
  );
};
