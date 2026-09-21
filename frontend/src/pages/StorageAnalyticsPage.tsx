import React, { useState } from 'react';
import { HardDrive, Image as ImageIcon, Video, Layers, PieChart, Sparkles, FolderArchive, ArrowUpRight } from '../components/icons';
import { useStorageAnalytics } from '../hooks/useAnalytics';
import { formatBytes } from '../utils/formatters';
import { MediaViewer } from '../components/media/MediaViewer';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { MediaRecord } from '../types/media';

export const StorageAnalyticsPage: React.FC = () => {
  const { data: analytics, isLoading } = useStorageAnalytics();
  const [inspectingMedia, setInspectingMedia] = useState<MediaRecord | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  if (isLoading || !analytics) {
    return (
      <div className='p-12 text-center text-xs text-[#A0A6B8]'>
        Calculating library storage analytics...
      </div>
    );
  }

  const totalBytes = analytics.total_media_bytes || 1;
  const photoPercent = Math.round((analytics.photo_bytes / totalBytes) * 100);
  const videoPercent = Math.round((analytics.video_bytes / totalBytes) * 100);
  const otherPercent = Math.max(0, 100 - photoPercent - videoPercent);

  return (
    <div className='space-y-8 max-w-7xl mx-auto pb-12'>
      {/* Header */}
      <div className='flex items-center justify-between pb-4 border-b border-[#232736]'>
        <div>
          <h2 className='text-xl font-bold text-white flex items-center gap-2'>
            <PieChart className='w-5 h-5 text-(--mm-accent)' /> Storage Intelligence
          </h2>
          <p className='text-xs text-[#A0A6B8]'>
            Instant offline storage analysis across media types, formats, and historical years.
          </p>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div className='p-5 bg-[#1A1D28] rounded-2xl border border-[#232736] space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='text-xs text-[#6B7280] font-medium'>Total Media Storage</span>
            <HardDrive className='w-4 h-4 text-(--mm-accent)' />
          </div>
          <p className='text-2xl font-extrabold text-white'>
            {formatBytes(analytics.total_media_bytes)}
          </p>
          <span className='text-[11px] text-[#A0A6B8] block'>
            {analytics.total_media_count} total files
          </span>
        </div>

        <div className='p-5 bg-[#1A1D28] rounded-2xl border border-[#232736] space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='text-xs text-[#6B7280] font-medium'>Photos Storage</span>
            <ImageIcon className='w-4 h-4 text-[#00D68F]' />
          </div>
          <p className='text-2xl font-extrabold text-white'>
            {formatBytes(analytics.photo_bytes)}
          </p>
          <span className='text-[11px] text-[#A0A6B8] block'>
            {analytics.photo_count} photos ({photoPercent}%)
          </span>
        </div>

        <div className='p-5 bg-[#1A1D28] rounded-2xl border border-[#232736] space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='text-xs text-[#6B7280] font-medium'>Videos & 4K Clips</span>
            <Video className='w-4 h-4 text-purple-400' />
          </div>
          <p className='text-2xl font-extrabold text-white'>
            {formatBytes(analytics.video_bytes)}
          </p>
          <span className='text-[11px] text-[#A0A6B8] block'>
            {analytics.video_count} videos ({videoPercent}%)
          </span>
        </div>

        <div className='p-5 bg-[#1A1D28] rounded-2xl border border-[#232736] space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='text-xs text-[#6B7280] font-medium'>Average File Size</span>
            <Layers className='w-4 h-4 text-[#FFB300]' />
          </div>
          <p className='text-2xl font-extrabold text-white'>
            {formatBytes(analytics.avg_file_size_bytes)}
          </p>
          <span className='text-[11px] text-[#A0A6B8] block'>
            Thumbnails: {formatBytes(analytics.thumbnail_bytes)}
          </span>
        </div>
      </div>

      {/* Storage Distribution Visual Bar */}
      <div className='p-6 bg-[#1A1D28] rounded-2xl border border-[#232736] space-y-4'>
        <div className='flex items-center justify-between text-xs font-semibold text-white'>
          <span>Storage Distribution</span>
          <span className='text-[#A0A6B8]'>100% of Active Library</span>
        </div>

        <div className='h-3 w-full bg-[#12141C] rounded-full overflow-hidden flex'>
          <div
            className='bg-[#00D68F] h-full transition-all'
            style={{ width: `${photoPercent}%` }}
            title={`Photos: ${photoPercent}%`}
          />
          <div
            className='bg-purple-500 h-full transition-all'
            style={{ width: `${videoPercent}%` }}
            title={`Videos: ${videoPercent}%`}
          />
          <div
            className='bg-(--mm-accent) h-full transition-all'
            style={{ width: `${otherPercent}%` }}
            title={`Other: ${otherPercent}%`}
          />
        </div>

        <div className='flex items-center gap-6 text-xs text-[#A0A6B8]'>
          <div className='flex items-center gap-2'>
            <div className='w-3 h-3 rounded bg-[#00D68F]' />
            <span>Photos ({photoPercent}%)</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-3 h-3 rounded bg-purple-500' />
            <span>Videos ({videoPercent}%)</span>
          </div>
          {otherPercent > 0 && (
            <div className='flex items-center gap-2'>
              <div className='w-3 h-3 rounded bg-(--mm-accent)' />
              <span>Other ({otherPercent}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* Breakdowns Grid */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* By Format */}
        <div className='p-5 bg-[#1A1D28] rounded-2xl border border-[#232736] space-y-4'>
          <h3 className='text-sm font-bold text-white'>By File Format</h3>
          <div className='space-y-2.5 max-h-60 overflow-y-auto'>
            {analytics.by_extension.map((ext) => (
              <div key={ext.extension} className='flex items-center justify-between text-xs'>
                <span className='font-mono font-bold uppercase text-white bg-[#12141C] px-2 py-0.5 rounded border border-[#232736]'>
                  .{ext.extension}
                </span>
                <span className='text-[#6B7280]'>{ext.count} files</span>
                <span className='font-semibold text-[#A0A6B8]'>{formatBytes(ext.size_bytes)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Year */}
        <div className='p-5 bg-[#1A1D28] rounded-2xl border border-[#232736] space-y-4'>
          <h3 className='text-sm font-bold text-white'>By Capture Year</h3>
          <div className='space-y-2.5 max-h-60 overflow-y-auto'>
            {analytics.by_year.map((yr) => (
              <div key={yr.year} className='flex items-center justify-between text-xs'>
                <span className='font-bold text-white'>{yr.year}</span>
                <span className='text-[#6B7280]'>{yr.count} files</span>
                <span className='font-semibold text-[#A0A6B8]'>{formatBytes(yr.size_bytes)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Size Bracket */}
        <div className='p-5 bg-[#1A1D28] rounded-2xl border border-[#232736] space-y-4'>
          <h3 className='text-sm font-bold text-white'>By Size Range</h3>
          <div className='space-y-2.5 max-h-60 overflow-y-auto'>
            {analytics.by_size_range.map((r) => (
              <div key={r.label} className='flex items-center justify-between text-xs'>
                <span className='font-medium text-white'>{r.label}</span>
                <span className='text-[#6B7280]'>{r.count} files</span>
                <span className='font-semibold text-[#A0A6B8]'>{formatBytes(r.size_bytes)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Largest Files Table */}
      <div className='p-6 bg-[#1A1D28] rounded-2xl border border-[#232736] space-y-4'>
        <div className='flex items-center justify-between'>
          <h3 className='text-sm font-bold text-white'>Largest Media Files (Top 20)</h3>
          <span className='text-xs text-[#6B7280]'>Click any item to inspect or play</span>
        </div>

        <div className='divide-y divide-[#232736]'>
          {analytics.largest_files.map((file, idx) => (
            <div
              key={file.id}
              onClick={() => {
                if (file.media_type === 'VIDEO') {
                  setPlayingVideoId(file.id);
                } else {
                  setInspectingMedia(file);
                }
              }}
              className='py-3 px-2 flex items-center justify-between hover:bg-[#12141C] rounded-xl cursor-pointer transition-colors group'
            >
              <div className='flex items-center gap-3'>
                <span className='text-xs font-mono font-bold text-[#6B7280] w-6'>{idx + 1}.</span>
                <div className='p-2 rounded-lg bg-[#232736] text-[#A0A6B8] group-hover:text-(--mm-accent)'>
                  {file.media_type === 'VIDEO' ? (
                    <Video className='w-4 h-4' />
                  ) : (
                    <ImageIcon className='w-4 h-4' />
                  )}
                </div>
                <div>
                  <h4 className='text-xs font-bold text-white group-hover:text-(--mm-accent) transition-colors'>
                    {file.filename}
                  </h4>
                  <span className='text-[11px] text-[#6B7280] font-mono'>
                    {file.relative_path}
                  </span>
                </div>
              </div>

              <div className='flex items-center gap-4'>
                {file.width && file.height && (
                  <span className='text-[11px] text-[#6B7280]'>
                    {file.width} × {file.height}
                  </span>
                )}
                <span className='text-xs font-bold text-white bg-[#12141C] px-2.5 py-1 rounded-lg border border-[#232736]'>
                  {formatBytes(file.size_bytes)}
                </span>
                <ArrowUpRight className='w-4 h-4 text-[#6B7280] group-hover:text-white transition-colors' />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Modal Player */}
      {playingVideoId && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-md'>
          <div className='relative w-full max-w-5xl bg-[#12141C] rounded-2xl overflow-hidden border border-[#232736] p-4 shadow-2xl'>
            <VideoPlayer
              mediaId={playingVideoId}
              onClose={() => setPlayingVideoId(null)}
            />
          </div>
        </div>
      )}

      {/* Media Lightbox */}
      <MediaViewer
        media={inspectingMedia}
        itemsList={analytics.largest_files}
        isOpen={!!inspectingMedia}
        onClose={() => setInspectingMedia(null)}
        onNavigate={(m) => setInspectingMedia(m)}
      />
    </div>
  );
};
