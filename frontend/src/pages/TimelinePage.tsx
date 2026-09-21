import React, { useState } from 'react';
import { Calendar, ChevronRight, Image as ImageIcon, Video, Sparkles, Folder } from '../components/icons';
import { useTimelineYears, useTimelineMonths, useTimelineMedia } from '../hooks/useTimeline';
import { useFavorites, useToggleFavorite } from '../hooks/useMedia';
import { MediaCard } from '../components/media/MediaCard';
import { MediaViewer } from '../components/media/MediaViewer';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { MediaRecord } from '../types/media';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const TimelinePage: React.FC = () => {
  const { data: years, isLoading: isYearsLoading } = useTimelineYears();
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [inspectingMedia, setInspectingMedia] = useState<MediaRecord | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // Default to newest year
  const activeYear = selectedYear || (years && years.length > 0 ? years[0].year : null);

  const { data: months } = useTimelineMonths(activeYear);
  const { data: mediaResponse, isLoading: isMediaLoading } = useTimelineMedia(
    activeYear,
    selectedMonth || undefined
  );

  const { data: favorites } = useFavorites();
  const toggleFavoriteMutation = useToggleFavorite();
  const favSet = new Set((favorites || []).map((f) => f.id));

  const items = mediaResponse?.items || [];

  return (
    <div className='space-y-8 max-w-7xl mx-auto pb-12'>
      {/* Header */}
      <div className='flex items-center justify-between pb-4 border-b border-[#232736]'>
        <div>
          <h2 className='text-xl font-bold text-white flex items-center gap-2'>
            <Calendar className='w-5 h-5 text-(--mm-accent)' /> Timeline Explorer
          </h2>
          <p className='text-xs text-[#A0A6B8]'>
            Hierarchical capture date timeline with instant on-demand drill-down.
          </p>
        </div>
      </div>

      {/* Year Selector Pills */}
      <div className='flex items-center gap-2 overflow-x-auto scrollbar-none py-1'>
        {isYearsLoading ? (
          <div className='text-xs text-[#A0A6B8]'>Loading timeline...</div>
        ) : (
          years?.map(({ year, count }) => (
            <button
              key={year}
              onClick={() => {
                setSelectedYear(year);
                setSelectedMonth(null);
              }}
              className={`px-4 py-2 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all ${
                activeYear === year
                  ? 'bg-(--mm-accent) text-white shadow-lg shadow-(--mm-accent)/20'
                  : 'bg-[#1A1D28] text-[#A0A6B8] hover:text-white border border-[#232736]'
              }`}
            >
              <span>{year}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeYear === year ? 'bg-white/20 text-white' : 'bg-[#12141C] text-[#6B7280]'
                }`}
              >
                {count}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Month Sub-Filter Chips */}
      {months && months.length > 0 && (
        <div className='flex items-center gap-2 overflow-x-auto scrollbar-none py-1 border-y border-[#232736]/40'>
          <button
            onClick={() => setSelectedMonth(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedMonth === null
                ? 'bg-[#1A1D28] text-white border border-(--mm-accent)'
                : 'text-[#6B7280] hover:text-[#A0A6B8]'
            }`}
          >
            All of {activeYear}
          </button>

          {months.map(({ month, count }) => {
            const mIdx = parseInt(month, 10);
            const label = MONTH_NAMES[mIdx] || month;
            return (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  selectedMonth === month
                    ? 'bg-(--mm-accent)/20 text-(--mm-accent) border border-(--mm-accent)/40'
                    : 'bg-[#1A1D28]/40 text-[#A0A6B8] hover:text-white border border-transparent'
                }`}
              >
                <span>{label}</span>
                <span className='text-[10px] text-[#6B7280]'>({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Media Grid */}
      {isMediaLoading ? (
        <div className='p-12 text-center text-xs text-[#A0A6B8]'>Loading media...</div>
      ) : items.length === 0 ? (
        <div className='p-16 text-center text-xs text-[#A0A6B8]'>No media found for this period.</div>
      ) : (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3'>
          {items.map((media) => (
            <MediaCard
              key={media.id}
              media={media}
              isFavorite={favSet.has(media.id)}
              onToggleFavorite={() =>
                toggleFavoriteMutation.mutate({
                  mediaId: media.id,
                  isFavorite: favSet.has(media.id),
                })
              }
              onClick={() => {
                if (media.media_type === 'VIDEO') {
                  setPlayingVideoId(media.id);
                } else {
                  setInspectingMedia(media);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Standalone Video Modal Player */}
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

      {/* Fullscreen Media Viewer */}
      <MediaViewer
        media={inspectingMedia}
        itemsList={items}
        isOpen={!!inspectingMedia}
        onClose={() => setInspectingMedia(null)}
        onNavigate={(m) => setInspectingMedia(m)}
        isFavorite={inspectingMedia ? favSet.has(inspectingMedia.id) : false}
        onToggleFavorite={() => {
          if (inspectingMedia) {
            toggleFavoriteMutation.mutate({
              mediaId: inspectingMedia.id,
              isFavorite: favSet.has(inspectingMedia.id),
            });
          }
        }}
      />
    </div>
  );
};
