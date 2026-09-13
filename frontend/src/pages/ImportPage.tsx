import React, { useState } from 'react';
import { DeviceSelector } from '../components/import/DeviceSelector';
import { FilterStep } from '../components/import/FilterStep';
import { PreviewStep } from '../components/import/PreviewStep';
import { JobProgress } from '../components/import/JobProgress';
import { Button } from '../components/common/Button';
import { useImportPreview, useStartImport, useJobStatus } from '../hooks/useImport';
import { ImportFilterParams } from '../types/import';
import { ArrowRight, Play, RefreshCw } from 'lucide-react';

export const ImportPage: React.FC = () => {
  const [deviceType, setDeviceType] = useState<'iphone' | 'local'>('iphone');
  const [customPath, setCustomPath] = useState('');
  const [filters, setFilters] = useState<ImportFilterParams>({});
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const importParams: ImportFilterParams = {
    ...filters,
    source_path: deviceType === 'local' ? customPath : undefined,
  };

  const {
    data: preview,
    isLoading: isPreviewLoading,
    refetch: refetchPreview,
  } = useImportPreview(importParams, true);

  const startImportMutation = useStartImport();
  const { data: currentJob } = useJobStatus(activeJobId);

  const handleStartImport = async () => {
    try {
      const res = await startImportMutation.mutateAsync(importParams);
      setActiveJobId(res.job_id);
    } catch (err: any) {
      alert(err.message || 'Failed to start import job');
    }
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
            icon={<RefreshCw className='w-3.5 h-3.5' />}
            onClick={() => refetchPreview()}
            disabled={isPreviewLoading}
          >
            Scan Device
          </Button>
        )}
      </div>

      {activeJobId ? (
        <JobProgress job={currentJob || null} onReset={() => setActiveJobId(null)} />
      ) : (
        <div className='space-y-8'>
          <DeviceSelector
            deviceType={deviceType}
            onSelectDeviceType={setDeviceType}
            customPath={customPath}
            onCustomPathChange={setCustomPath}
          />

          <FilterStep filters={filters} onChange={setFilters} />

          <PreviewStep preview={preview || null} isLoading={isPreviewLoading} />

          <div className='flex justify-end pt-4 border-t border-[#232736]'>
            <Button
              variant='primary'
              size='lg'
              icon={<Play className='w-4 h-4 fill-white' />}
              disabled={
                isPreviewLoading ||
                !preview ||
                !preview.can_fit ||
                preview.new_items_count === 0 ||
                startImportMutation.isPending
              }
              onClick={handleStartImport}
            >
              {startImportMutation.isPending ? 'Starting...' : 'Execute Safe Import'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
