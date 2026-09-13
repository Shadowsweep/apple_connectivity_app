import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Check, FastForward } from 'lucide-react';
import { mediaApi } from '../../api/mediaApi';
import { playbackApi } from '../../api/playbackApi';
import { formatDuration } from '../../utils/formatters';

interface VideoPlayerProps {
  mediaId: string;
  initialPositionMs?: number;
  filename?: string;
  onClose?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  mediaId,
  initialPositionMs = 0,
  filename,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(initialPositionMs);
  const [durationMs, setDurationMs] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const streamUrl = mediaApi.getStreamUrl(mediaId);

  // Sync initial position
  useEffect(() => {
    if (videoRef.current && initialPositionMs > 0) {
      videoRef.current.currentTime = initialPositionMs / 1000;
    }
  }, [initialPositionMs]);

  // Periodic watch progress sync
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

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const seekRelative = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  }, [isMuted]);

  // Desktop Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(5);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'Escape':
          if (!document.fullscreenElement && onClose) {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seekRelative, toggleFullscreen, toggleMute, onClose]);

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

  const cycleSpeed = () => {
    if (!videoRef.current) return;
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextRate = speeds[nextIdx];
    videoRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
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
    <div
      ref={containerRef}
      onMouseMove={() => setShowControls(true)}
      className='relative w-full aspect-video bg-black rounded-3xl overflow-hidden group shadow-2xl flex flex-col justify-end select-none'
    >
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

      {/* Top Title Overlay */}
      {filename && (
        <div className={'absolute top-0 inset-x-0 p-6 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 pointer-events-none ' + (showControls ? 'opacity-100' : 'opacity-0')}>
          <h3 className='text-sm font-semibold text-white truncate max-w-xl'>{filename}</h3>
        </div>
      )}

      {/* Control Bar Overlay */}
      <div className={'absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-3 transition-opacity duration-300 ' + (showControls ? 'opacity-100' : 'opacity-0')}>
        {/* Scrub Bar */}
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

        {/* Action Controls Row */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <button
              onClick={togglePlay}
              className='p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors'
            >
              {isPlaying ? <Pause className='w-5 h-5' /> : <Play className='w-5 h-5 fill-white' />}
            </button>

            <button
              onClick={() => seekRelative(-5)}
              className='p-2 text-[#A0A6B8] hover:text-white transition-colors'
              title='Skip -5s (Left Arrow)'
            >
              <RotateCcw className='w-4 h-4' />
            </button>

            <span className='text-xs font-mono text-[#A0A6B8]'>
              {formatDuration(currentTimeMs)} / {formatDuration(durationMs)}
            </span>
          </div>

          <div className='flex items-center gap-3'>
            {isCompleted && (
              <span className='px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#00D68F]/20 text-[#00D68F] flex items-center gap-1'>
                <Check className='w-3 h-3' /> Watched
              </span>
            )}

            {/* Playback Speed Pill */}
            <button
              onClick={cycleSpeed}
              className='px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors flex items-center gap-1'
            >
              <FastForward className='w-3 h-3 text-[#2E7CF6]' />
              {playbackRate + 'x'}
            </button>

            {/* Volume */}
            <button
              onClick={toggleMute}
              className='p-2 text-[#A0A6B8] hover:text-white transition-colors'
              title='Mute (M)'
            >
              {isMuted ? <VolumeX className='w-4 h-4 text-[#FF3B30]' /> : <Volume2 className='w-4 h-4' />}
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className='p-2 text-[#A0A6B8] hover:text-white transition-colors'
              title='Fullscreen (F)'
            >
              <Maximize className='w-4 h-4' />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
