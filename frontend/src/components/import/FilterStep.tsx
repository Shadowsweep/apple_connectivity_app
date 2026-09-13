import React from 'react';
import { Calendar, Filter, Video } from 'lucide-react';
import { ImportFilterParams } from '../../types/import';

interface FilterStepProps {
  filters: ImportFilterParams;
  onChange: (updated: ImportFilterParams) => void;
}

export const FilterStep: React.FC<FilterStepProps> = ({ filters, onChange }) => {
  return (
    <div className='space-y-4'>
      <h3 className='text-sm font-semibold text-white'>2. Configure Import Filters</h3>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#1A1D28] p-5 rounded-2xl border border-[#232736]'>
        {/* Date Range */}
        <div>
          <label className='block text-xs font-medium text-[#A0A6B8] mb-2 flex items-center gap-1.5'>
            <Calendar className='w-3.5 h-3.5 text-[#2E7CF6]' /> Capture Date Range
          </label>
          <div className='grid grid-cols-2 gap-2'>
            <div>
              <span className='block text-[10px] text-[#6B7280] mb-1'>From</span>
              <input
                type='date'
                value={filters.date_from ? filters.date_from.split('T')[0] : ''}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    date_from: e.target.value ? e.target.value + 'T00:00:00' : undefined,
                  })
                }
                className='w-full px-2.5 py-1.5 rounded-lg bg-[#12141C] border border-[#232736] text-white text-xs focus:outline-none focus:border-[#2E7CF6]'
              />
            </div>
            <div>
              <span className='block text-[10px] text-[#6B7280] mb-1'>To</span>
              <input
                type='date'
                value={filters.date_to ? filters.date_to.split('T')[0] : ''}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    date_to: e.target.value ? e.target.value + 'T23:59:59' : undefined,
                  })
                }
                className='w-full px-2.5 py-1.5 rounded-lg bg-[#12141C] border border-[#232736] text-white text-xs focus:outline-none focus:border-[#2E7CF6]'
              />
            </div>
          </div>
        </div>

        {/* Min Video Size */}
        <div>
          <label className='block text-xs font-medium text-[#A0A6B8] mb-2 flex items-center gap-1.5'>
            <Video className='w-3.5 h-3.5 text-[#2E7CF6]' /> Minimum Video Size
          </label>
          <select
            value={filters.min_video_size_bytes ? String(filters.min_video_size_bytes / (1024 * 1024)) : '0'}
            onChange={(e) => {
              const mb = parseInt(e.target.value, 10);
              onChange({
                ...filters,
                min_video_size_bytes: mb > 0 ? mb * 1024 * 1024 : undefined,
              });
            }}
            className='w-full px-3 py-2 rounded-lg bg-[#12141C] border border-[#232736] text-white text-xs focus:outline-none focus:border-[#2E7CF6]'
          >
            <option value='0'>All video sizes (No minimum)</option>
            <option value='50'>Larger than 50 MB</option>
            <option value='100'>Larger than 100 MB</option>
            <option value='500'>Larger than 500 MB (4K clips)</option>
            <option value='1024'>Larger than 1 GB (Long videos)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
