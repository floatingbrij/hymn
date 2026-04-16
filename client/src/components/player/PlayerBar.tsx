import {
  IoPlaySharp,
  IoPauseSharp,
  IoPlaySkipForwardSharp,
  IoPlaySkipBackSharp,
  IoShuffleOutline,
  IoRepeatOutline,
  IoVolumeHighOutline,
  IoVolumeLowOutline,
  IoVolumeMuteOutline,
  IoListOutline,
  IoMusicalNotesOutline,
  IoAlertCircleOutline,
  IoChevronUpOutline,
  IoHeartOutline,
  IoHeart,
} from 'react-icons/io5';
import { usePlayerStore } from '../../stores/playerStore';
import { useQueueStore } from '../../stores/queueStore';
import { useJamStore } from '../../stores/jamStore';
import { useAuthStore } from '../../stores/authStore';
import { formatTime } from '../../utils/format';
import { useState, useRef, useCallback, useEffect } from 'react';
import * as api from '../../services/api';
import toast from 'react-hot-toast';

interface PlayerBarProps {
  onQueueToggle: () => void;
  queueOpen: boolean;
  onNowPlayingToggle?: () => void;
}

export function PlayerBar({ onQueueToggle, queueOpen, onNowPlayingToggle }: PlayerBarProps) {
  const { currentTrack, isPlaying, isLoading, position, duration, volume, error } = usePlayerStore();
  const { shuffle, repeat } = useQueueStore();
  const { isInJam, jamId, participants } = useJamStore();
  const { user } = useAuthStore();
  const [liked, setLiked] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);

  // Check if current track is liked
  useEffect(() => {
    if (!currentTrack || !user) { setLiked(false); return; }
    api.getLikedTracks()
      .then((tracks) => setLiked(tracks.some((t: any) => t.video_id === currentTrack.videoId)))
      .catch(() => {});
  }, [currentTrack?.videoId, user]);

  const handlePlayPause = () => {
    if (isInJam) {
      const jam = useJamStore.getState();
      if (isPlaying) jam.jamPause(); else jam.jamPlay();
    } else {
      usePlayerStore.getState().togglePlay();
    }
  };

  const handleNext = () => {
    if (isInJam) useJamStore.getState().jamNext();
    else useQueueStore.getState().next();
  };

  const handlePrevious = () => {
    if (isInJam) useJamStore.getState().jamPrevious();
    else useQueueStore.getState().previous();
  };

  const handleSeek = (pos: number) => {
    if (isInJam) useJamStore.getState().jamSeek(pos);
    else usePlayerStore.getState().seek(pos);
  };

  const handleVolumeChange = (vol: number) => {
    usePlayerStore.getState().setVolume(vol);
  };

  const handleLike = async () => {
    if (!user || !currentTrack) return;
    try {
      if (liked) {
        await api.unlikeTrack(currentTrack.videoId);
        setLiked(false);
      } else {
        await api.likeTrack({
          videoId: currentTrack.videoId,
          title: currentTrack.title,
          artist: currentTrack.artist,
          thumbnail: currentTrack.thumbnail,
          duration: currentTrack.duration,
        });
        setLiked(true);
        setLikeAnimating(true);
        setTimeout(() => setLikeAnimating(false), 350);
      }
    } catch {
      toast.error('Failed to update liked songs');
    }
  };

  return (
    <>
      {/* ===== MOBILE PLAYER BAR ===== */}
      <div className="md:hidden fixed bottom-14 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
        {/* Mini progress bar on top of mobile player */}
        {currentTrack && duration > 0 && (
          <div className="h-0.5 bg-surface-300">
            <div
              className="h-full bg-accent transition-[width] duration-300 ease-linear"
              style={{ width: `${(position / duration) * 100}%` }}
            />
          </div>
        )}
        <div className="h-16 bg-surface-100 border-t border-surface-400/50 flex items-center px-3 gap-3">
          {currentTrack ? (
            <>
              {/* Tap to open NowPlaying */}
              <button onClick={onNowPlayingToggle} className="flex items-center gap-3 min-w-0 flex-1">
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-11 h-11 rounded object-cover shrink-0"
                />
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-medium text-cream truncate">{currentTrack.title}</p>
                  <p className="text-xs text-cream-muted truncate">{currentTrack.artist}</p>
                </div>
              </button>

              {/* Play/Pause */}
              <button
                onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
                className="w-10 h-10 rounded-full bg-cream flex items-center justify-center text-surface shrink-0 active:scale-95 transition-transform"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
                ) : isPlaying ? (
                  <IoPauseSharp className="text-lg" />
                ) : (
                  <IoPlaySharp className="text-lg ml-0.5" />
                )}
              </button>

              {/* Next */}
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="p-2 text-cream-dim active:text-cream shrink-0"
              >
                <IoPlaySkipForwardSharp className="text-xl" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 text-cream-muted flex-1">
              <div className="w-11 h-11 rounded bg-surface-200 flex items-center justify-center shrink-0">
                <IoMusicalNotesOutline className="text-lg" />
              </div>
              <p className="text-sm">No track playing</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== DESKTOP PLAYER BAR ===== */}
      <div className="hidden md:flex fixed bottom-0 left-0 right-0 h-20 bg-surface-100 border-t border-surface-400/50 items-center px-4 z-50">
      {/* Left: Track Info */}
      <div className="w-72 flex items-center gap-3 min-w-0">
        {currentTrack ? (
          <>
            <button
              onClick={onNowPlayingToggle}
              className="relative group/art shrink-0"
              title="Now playing"
            >
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-13 h-13 rounded object-cover transition-all duration-200 group-hover/art:opacity-80 group-hover/art:scale-105"
                style={{ width: '52px', height: '52px' }}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/art:opacity-100 transition-opacity">
                <IoChevronUpOutline className="text-cream text-lg" />
              </div>
            </button>
            <div className="min-w-0">
              <p className="text-sm font-medium text-cream truncate">{currentTrack.title}</p>
              <p className="text-xs text-cream-muted truncate">{currentTrack.artist}</p>
            </div>
            {user && (
              <button
                onClick={handleLike}
                className={`shrink-0 p-1 transition-colors ${liked ? 'text-accent' : 'text-cream-muted hover:text-cream'}`}
                title={liked ? 'Unlike' : 'Like'}
              >
                {liked ? <IoHeart className={`text-sm ${likeAnimating ? 'like-pop' : ''}`} /> : <IoHeartOutline className="text-sm" />}
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3 text-cream-muted">
            <div className="w-[52px] h-[52px] rounded bg-surface-200 flex items-center justify-center">
              <IoMusicalNotesOutline className="text-lg" />
            </div>
            <p className="text-sm">No track playing</p>
          </div>
        )}
      </div>

      {/* Center: Controls + Progress */}
      <div className="flex-1 flex flex-col items-center gap-1 max-w-2xl mx-auto">
        {/* Error indicator */}
        {error && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-900/80 border border-red-700/50 text-red-200 text-xs whitespace-nowrap slide-down">
            <IoAlertCircleOutline className="text-sm shrink-0" />
            <span className="truncate max-w-xs">{error}</span>
            <button
              onClick={() => usePlayerStore.getState().setError(null)}
              className="text-red-300 hover:text-red-100 ml-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => useQueueStore.getState().toggleShuffle()}
            className={`text-lg transition-colors ${shuffle ? 'text-accent' : 'text-cream-muted hover:text-cream'}`}
            title="Shuffle"
          >
            <IoShuffleOutline />
          </button>
          <button onClick={handlePrevious} className="text-xl text-cream-dim hover:text-cream hover:scale-110 active:scale-95 transition-all duration-150" title="Previous">
            <IoPlaySkipBackSharp />
          </button>
          <button
            onClick={handlePlayPause}
            disabled={!currentTrack && !isLoading}
            className="w-9 h-9 rounded-full bg-cream flex items-center justify-center text-surface hover:bg-accent-light hover:scale-105 active:scale-95 transition-all duration-150 disabled:opacity-30"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
            ) : isPlaying ? (
              <IoPauseSharp className="text-lg" />
            ) : (
              <IoPlaySharp className="text-lg ml-0.5" />
            )}
          </button>
          <button onClick={handleNext} className="text-xl text-cream-dim hover:text-cream hover:scale-110 active:scale-95 transition-all duration-150" title="Next">
            <IoPlaySkipForwardSharp />
          </button>
          <button
            onClick={() => useQueueStore.getState().cycleRepeat()}
            className={`text-lg transition-colors relative ${
              repeat !== 'off' ? 'text-accent' : 'text-cream-muted hover:text-cream'
            }`}
            title={`Repeat: ${repeat}`}
          >
            <IoRepeatOutline />
            {repeat === 'one' && (
              <span className="absolute -top-1 -right-1.5 text-[9px] font-bold text-accent">1</span>
            )}
          </button>
        </div>

        {/* Progress bar */}
        <ProgressBar position={position} duration={duration} onSeek={handleSeek} />
      </div>

      {/* Right: Volume + Queue + Jam */}
      <div className="w-72 flex items-center justify-end gap-3">
        {isInJam && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-cyan/15 text-accent-cyan text-xs font-medium animate-pulse-slow">
            <IoMusicalNotesOutline className="text-sm" />
            <span>Jam &middot; {participants.length}</span>
          </div>
        )}

        <VolumeControl volume={volume} onChange={handleVolumeChange} />

        <button
          onClick={onQueueToggle}
          className={`p-2 rounded-md transition-colors ${
            queueOpen ? 'text-accent bg-surface-300/60' : 'text-cream-muted hover:text-cream'
          }`}
          title="Queue"
        >
          <IoListOutline className="text-lg" />
        </button>
      </div>
      </div>
    </>
  );
}

function ProgressBar({
  position,
  duration,
  onSeek,
}: {
  position: number;
  duration: number;
  onSeek: (pos: number) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPos, setHoverPos] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);

  const calcPosition = useCallback(
    (clientX: number) => {
      if (!barRef.current || !duration) return 0;
      const rect = barRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const pos = calcPosition(e.clientX);
    onSeek(pos);

    const handleMove = (e: MouseEvent) => {
      const pos = calcPosition(e.clientX);
      onSeek(pos);
    };
    const handleUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    onSeek(calcPosition(touch.clientX));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    onSeek(calcPosition(touch.clientX));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-[11px] text-cream-muted w-10 text-right tabular-nums">
        {formatTime(position)}
      </span>
      <div
        ref={barRef}
        className="flex-1 h-1 bg-surface-300 rounded-full cursor-pointer group relative touch-none"
        style={{ padding: '8px 0', margin: '-8px 0', backgroundClip: 'content-box' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseMove={(e) => {
          const pos = calcPosition(e.clientX);
          setHoverPos(pos);
          if (barRef.current) {
            const rect = barRef.current.getBoundingClientRect();
            setHoverX(e.clientX - rect.left);
          }
        }}
        onMouseLeave={() => setHoverPos(null)}
      >
        <div
          className="absolute inset-y-0 left-0 bg-cream-dim rounded-full group-hover:bg-accent transition-colors"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-cream rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
        {/* Hover time tooltip */}
        {hoverPos !== null && duration > 0 && (
          <div
            className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 rounded bg-surface-300 text-cream text-[10px] tabular-nums pointer-events-none"
            style={{ left: `${hoverX}px` }}
          >
            {formatTime(hoverPos)}
          </div>
        )}
      </div>
      <span className="text-[11px] text-cream-muted w-10 tabular-nums">
        {formatTime(duration)}
      </span>
    </div>
  );
}

function VolumeControl({ volume, onChange }: { volume: number; onChange: (v: number) => void }) {
  const [prevVolume, setPrevVolume] = useState(0.7);
  const barRef = useRef<HTMLDivElement>(null);

  const Icon = volume === 0 ? IoVolumeMuteOutline : volume < 0.5 ? IoVolumeLowOutline : IoVolumeHighOutline;

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      onChange(0);
    } else {
      onChange(prevVolume);
    }
  };

  const calcVolume = useCallback((clientX: number) => {
    if (!barRef.current) return volume;
    const rect = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, [volume]);

  const handleMouseDown = (e: React.MouseEvent) => {
    onChange(calcVolume(e.clientX));

    const handleMove = (ev: MouseEvent) => {
      onChange(calcVolume(ev.clientX));
    };
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    onChange(calcVolume(e.touches[0].clientX));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    onChange(calcVolume(e.touches[0].clientX));
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={toggleMute} className="text-cream-muted hover:text-cream transition-colors" title={volume === 0 ? 'Unmute' : 'Mute'}>
        <Icon className="text-lg" />
      </button>
      <div
        ref={barRef}
        className="w-24 h-1 bg-surface-300 rounded-full cursor-pointer group relative touch-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div
          className="absolute inset-y-0 left-0 bg-cream-muted group-hover:bg-cream rounded-full transition-colors"
          style={{ width: `${volume * 100}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-cream rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${volume * 100}% - 5px)` }}
        />
      </div>
    </div>
  );
}
