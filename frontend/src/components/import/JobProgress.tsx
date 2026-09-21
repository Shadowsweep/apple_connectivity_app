import React, { useMemo } from 'react';
import { CheckCircle2, XCircle, Loader2, Clock, Activity, HardDrive } from '../icons';
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

  const processed = job.completed + job.failed;
  const percentage = job.total > 0 ? Math.min(100, Math.round((processed / job.total) * 100)) : 0;

  // Dynamic ETA calculation
  const { etaText, speedText } = useMemo(() => {
    if (!isRunning || !job.started_at || processed === 0 || job.total === 0) {
      return { etaText: null, speedText: null };
    }

    try {
      const startTime = new Date(job.started_at).getTime();
      const now = Date.now();
      const elapsedSec = (now - startTime) / 1000;

      if (elapsedSec > 2 && processed > 0) {
        const rate = processed / elapsedSec; // items per second
        const remainingItems = Math.max(0, job.total - processed);
        const remainingSec = Math.round(remainingItems / rate);

        let etaStr = '';
        if (remainingSec < 60) {
          etaStr = `${remainingSec}s remaining`;
        } else {
          const mins = Math.floor(remainingSec / 60);
          const secs = remainingSec % 60;
          etaStr = `${mins}m ${secs}s remaining`;
        }

        const speedStr = rate >= 1 ? `${rate.toFixed(1)} files/s` : `${(rate * 60).toFixed(0)} files/min`;

        return { etaText: etaStr, speedText: speedStr };
      }
    } catch {
      // ignore
    }

    return { etaText: 'Calculating ETA...', speedText: null };
  }, [isRunning, job.started_at, processed, job.total]);

  return (
    <div className='bg-[#1A1D28] rounded-2xl p-6 border border-[#232736] space-y-6 shadow-xl'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          {isRunning && (
            <div className='p-2.5 rounded-xl bg-(--mm-accent)/10 text-(--mm-accent)'>
              <Loader2 className='w-6 h-6 animate-spin' />
            </div>
          )}
          {isCompleted && (
            <div className='p-2.5 rounded-xl bg-[#00D68F]/10 text-[#00D68F]'>
              <CheckCircle2 className='w-6 h-6' />
            </div>
          )}
          {isFailed && (
            <div className='p-2.5 rounded-xl bg-[#FF3B30]/10 text-[#FF3B30]'>
              <XCircle className='w-6 h-6' />
            </div>
          )}

          <div>
            <h4 className='text-sm font-bold text-white'>
              {isRunning && `Importing Media (${percentage}%)`}
              {isCompleted && 'Import Verified & Successfully Completed!'}
              {isFailed && 'Import Failed'}
            </h4>
            <p className='text-xs text-[#A0A6B8]'>
              {processed} of {job.total} files processed
            </p>
          </div>
        </div>

        {(isCompleted || isFailed) && (
          <Button variant='secondary' size='sm' onClick={onReset}>
            Start Another Import
          </Button>
        )}
      </div>

      {/* Progress Bar & Real-time ETA */}
      <div className='space-y-2'>
        <div className='flex justify-between items-center text-xs'>
          <span className='font-semibold text-white font-mono'>{percentage}%</span>
          {isRunning && etaText && (
            <span className='flex items-center gap-1.5 text-[#00D68F] font-mono text-[11px]'>
              <Clock className='w-3.5 h-3.5' /> {etaText}
            </span>
          )}
        </div>
        <ProgressBar
          progress={percentage}
          height='h-3'
          variant={isCompleted ? 'verified' : isFailed ? 'warning' : 'primary'}
        />
      </div>

      {/* Real-time Statistics Cards */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs'>
        <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736]'>
          <span className='text-[#6B7280] block text-[11px] mb-0.5'>Imported</span>
          <span className='font-bold text-[#00D68F] text-sm'>{job.completed}</span>
        </div>
        <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736]'>
          <span className='text-[#6B7280] block text-[11px] mb-0.5'>Failed / Skipped</span>
          <span className='font-bold text-[#FFB300] text-sm'>{job.failed}</span>
        </div>
        <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736]'>
          <span className='text-[#6B7280] block text-[11px] mb-0.5'>Total Target</span>
          <span className='font-bold text-white text-sm'>{job.total}</span>
        </div>
        <div className='p-3 bg-[#12141C] rounded-xl border border-[#232736]'>
          <span className='text-[#6B7280] block text-[11px] mb-0.5'>Transfer Speed</span>
          <span className='font-bold text-(--mm-accent) text-sm'>
            {speedText || (isRunning ? 'Calculating...' : 'Done')}
          </span>
        </div>
      </div>

      {isCompleted && (
        <div className='flex items-center justify-between p-3.5 rounded-xl bg-[#00D68F]/10 border border-[#00D68F]/20 text-xs text-[#00D68F]'>
          <span>All transferred files verified with SHA-256 integrity checks.</span>
          <a
            href='/media'
            className='font-bold text-white bg-[#00D68F] hover:bg-[#00D68F]/90 px-3 py-1.5 rounded-lg text-xs transition-colors'
          >
            View in Library →
          </a>
        </div>
      )}
    </div>
  );
};
