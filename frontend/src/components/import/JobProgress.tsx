import React from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { JobRecord } from '../../types/import';
import { ProgressBar } from '../common/ProgressBar';
import { Button } from '../common/Button';

interface JobProgressProps {
  job: JobRecord | null;
  onReset: () => void;
}

export const JobProgress: React.FC<JobProgressProps> = ({ job, onReset }) => {
  if (!job) return null;

  const isCompleted = job.status === 'COMPLETED';
  const isFailed = job.status === 'FAILED';
  const isRunning = job.status === 'RUNNING' || job.status === 'QUEUED';

  const percentage = job.total > 0 ? (job.progress / job.total) * 100 : 0;

  return (
    <div className='bg-[#1A1D28] rounded-2xl p-6 border border-[#232736] space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          {isRunning && <Loader2 className='w-5 h-5 text-[#2E7CF6] animate-spin' />}
          {isCompleted && <CheckCircle2 className='w-5 h-5 text-[#00D68F]' />}
          {isFailed && <XCircle className='w-5 h-5 text-[#FF3B30]' />}

          <div>
            <h4 className='text-sm font-semibold text-white'>
              {isRunning && 'Import in progress...'}
              {isCompleted && 'Import verified and completed!'}
              {isFailed && 'Import failed!'}
            </h4>
            <p className='text-xs text-[#A0A6B8]'>
              Processed {job.completed + job.failed} of {job.total} files
            </p>
          </div>
        </div>

        {(isCompleted || isFailed) && (
          <Button variant='secondary' size='sm' onClick={onReset}>
            Start Another Import
          </Button>
        )}
      </div>

      <ProgressBar
        progress={percentage}
        height='h-3'
        variant={isCompleted ? 'verified' : isFailed ? 'warning' : 'primary'}
        showLabel
      />

      <div className='grid grid-cols-3 gap-3 text-center text-xs'>
        <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736]'>
          <span className='text-[#6B7280] block text-[11px] mb-0.5'>Imported</span>
          <span className='font-bold text-[#00D68F]'>{job.completed}</span>
        </div>
        <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736]'>
          <span className='text-[#6B7280] block text-[11px] mb-0.5'>Failed</span>
          <span className='font-bold text-[#FF3B30]'>{job.failed}</span>
        </div>
        <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736]'>
          <span className='text-[#6B7280] block text-[11px] mb-0.5'>Total Target</span>
          <span className='font-bold text-white'>{job.total}</span>
        </div>
      </div>
    </div>
  );
};
