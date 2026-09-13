import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Check } from 'lucide-react';
import { mediaApi } from '../../api/mediaApi';
import { playbackApi } from '../../api/playbackApi';
import { formatDuration } from '../../utils/formatters';

interface VideoPlayerProps {
  mediaId: string;
  initialPositionMs?: number;
  onClose?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  mediaId,
  initialPositionMs = 0,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(initialPositionMs);
  const [durationMs, setDurationMs] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const streamUrl = mediaApi.getStreamUrl(mediaId);

  useEffect(() => {
    if (videoRef.current && initialPositionMs > 0) {
      videoRef.current.currentTime = initialPositionMs / 1000;
    }
  }, [initialPositionMs]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && isPlaying) {
        const curMs = Math.floor(videoRef.current.currentTime * 1000);
        const durMs = Math.floor(videoRef.current.duration * 1000) || durationMs;
        if (durMs > 0) {
          playbackApi.updateProgress(mediaId, {
            position_ms: curMs,
            duration_ms: durMs,
            completed: curMs / durMs > 0.95,
          });
        }
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      if (videoRef.current) {
        const curMs = Math.floor(videoRef.current.currentTime * 1000);
        const durMs = Math.floor(videoRef.current.duration * 1000) || durationMs;
        if (durMs > 0) {
          playbackApi.updateProgress(mediaId, {
            position_ms: curMs,
            duration_ms: durMs,
            completed: curMs / durMs > 0.95,
          });
        }
      }
    };
  }, [mediaId, isPlaying, durationMs]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTimeMs(Math.floor(videoRef.current.currentTime * 1000));
    if (videoRef.current.duration) {
      setDurationMs(Math.floor(videoRef.current.duration * 1000));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = val / 1000;
      setCurrentTimeMs(val);
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setIsCompleted(true);
    if (durationMs > 0) {
      playbackApi.updateProgress(mediaId, {
        position_ms: durationMs,
        duration_ms: durationMs,
        completed: true,
      });
    }
  };

  return (
    <div className='relative w-full aspect-video bg-black rounded-xl overflow-hidden group shadow-2xl flex flex-col justify-end'>
      <video
        ref={videoRef}
        src={streamUrl}
        className='w-full h-full object-contain cursor-pointer'
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className='absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
        <div className='flex items-center gap-2'>
          <input
            type='range'
            min={0}
            max={durationMs || 100}
            value={currentTimeMs}
            onChange={handleSeek}
            className='w-full h-1.5 bg-[#30354A] rounded-lg appearance-none cursor-pointer accent-[#2E7CF6]'
          />
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <button
              onClick={togglePlay}
              className='p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors'
            >
              {isPlaying ? <Pause className='w-4 h-4' /> : <Play className='w-4 h-4 fill-white' />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                }
              }}
              className='p-2 text-[#A0A6B8] hover:text-white transition-colors'
              title='Replay 10s'
            >
              <RotateCcw className='w-4 h-4' />
            </button>

            <span className='text-xs text-[#A0A6B8]'>
              {formatDuration(currentTimeMs)} / {formatDuration(durationMs)}
            </span>
          </div>

          <div className='flex items-center gap-3'>
            {isCompleted && (
              <span className='px-2 py-0.5 rounded text-[11px] font-semibold bg-[#00D68F]/20 text-[#00D68F] flex items-center gap-1'>
                <Check className='w-3 h-3' /> Watched
              </span>
            )}

            <button
              onClick={() => {
                if (!videoRef.current) return;
                const nextMute = !isMuted;
                videoRef.current.muted = nextMute;
                setIsMuted(nextMute);
              }}
              className='p-2 text-[#A0A6B8] hover:text-white transition-colors'
            >
              {isMuted ? <VolumeX className='w-4 h-4' /> : <Volume2 className='w-4 h-4' />}
            </button>

            <button
              onClick={toggleFullscreen}
              className='p-2 text-[#A0A6B8] hover:text-white transition-colors'
            >
              <Maximize className='w-4 h-4' />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
