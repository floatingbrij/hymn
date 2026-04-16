import { motion, AnimatePresence } from 'framer-motion';
import {
  IoChevronDownOutline,
  IoPlaySharp,
  IoPauseSharp,
  IoPlaySkipForwardSharp,
  IoPlaySkipBackSharp,
  IoShuffleOutline,
  IoRepeatOutline,
  IoHeartOutline,
  IoHeart,
  IoListOutline,
} from 'react-icons/io5';
import { usePlayerStore } from '../../stores/playerStore';
import { useQueueStore } from '../../stores/queueStore';
import { useJamStore } from '../../stores/jamStore';
import { useAuthStore } from '../../stores/authStore';
import { formatTime } from '../../utils/format';
import { useState, useRef, useCallback, useEffect } from 'react';
import * as api from '../../services/api';
import toast from 'react-hot-toast';

interface NowPlayingProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NowPlaying({ isOpen, onClose }: NowPlayingProps) {
  const { currentTrack, isPlaying, isLoading, position, duration, volume, error } = usePlayerStore();
  const { shuffle, repeat, tracks, currentIndex } = useQueueStore();
  const { isInJam } = useJamStore();
  const { user } = useAuthStore();
  const [liked, setLiked] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);

  useEffect(() => {
    if (!currentTrack || !user) { setLiked(false); return; }
    api.getLikedTracks()
      .then((ts) => setLiked(ts.some((t: any) => t.video_id === currentTrack.videoId)))
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

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  const upNext = tracks.slice(currentIndex + 1, currentIndex + 4);

  return (
    <AnimatePresence>
      {isOpen && currentTrack && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'tween', duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
          className="fixed inset-0 z-[60] bg-surface flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 md:px-6 pt-4 pb-2">
            <button onClick={onClose} className="p-2 -ml-2 text-cream-dim hover:text-cream hover:scale-110 active:scale-95 transition-all duration-150">
              <IoChevronDownOutline className="text-xl" />
            </button>
            <p className="text-xs text-cream-muted uppercase tracking-widest">Now Playing</p>
            <div className="w-8" />
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-8 max-w-lg mx-auto w-full gap-6 md:gap-8">
            {/* Album art */}
            <motion.img
              key={currentTrack.videoId}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className={`w-56 h-56 md:w-72 md:h-72 rounded-xl object-cover shadow-2xl shadow-black/50 ${isPlaying ? 'animate-vinyl-spin' : ''}`}
              style={{ animationDuration: '20s' }}
            />

            {/* Track info */}
            <div className="text-center w-full">
              <h2 className="font-display text-2xl text-cream mb-1 truncate">{currentTrack.title}</h2>
              <p className="text-cream-dim truncate">{currentTrack.artist}</p>
            </div>

            {/* Progress */}
            <div className="w-full space-y-2">
              <NowPlayingProgress position={position} duration={duration} onSeek={handleSeek} />
              <div className="flex justify-between text-[11px] text-cream-muted tabular-nums">
                <span>{formatTime(position)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 md:gap-8">
              <button
                onClick={() => useQueueStore.getState().toggleShuffle()}
                className={`text-xl transition-colors ${shuffle ? 'text-accent' : 'text-cream-muted hover:text-cream'}`}
              >
                <IoShuffleOutline />
              </button>
              <button onClick={handlePrevious} className="text-2xl text-cream-dim hover:text-cream hover:scale-110 active:scale-95 transition-all duration-150">
                <IoPlaySkipBackSharp />
              </button>
              <button
                onClick={handlePlayPause}
                className="w-16 h-16 rounded-full bg-cream flex items-center justify-center text-surface hover:bg-accent-light hover:scale-105 active:scale-95 transition-all duration-150"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-3 border-surface/30 border-t-surface rounded-full animate-spin" />
                ) : isPlaying ? (
                  <IoPauseSharp className="text-2xl" />
                ) : (
                  <IoPlaySharp className="text-2xl ml-1" />
                )}
              </button>
              <button onClick={handleNext} className="text-2xl text-cream-dim hover:text-cream hover:scale-110 active:scale-95 transition-all duration-150">
                <IoPlaySkipForwardSharp />
              </button>
              <button
                onClick={() => useQueueStore.getState().cycleRepeat()}
                className={`text-xl transition-colors relative ${
                  repeat !== 'off' ? 'text-accent' : 'text-cream-muted hover:text-cream'
                }`}
              >
                <IoRepeatOutline />
                {repeat === 'one' && (
                  <span className="absolute -top-1 -right-1.5 text-[9px] font-bold text-accent">1</span>
                )}
              </button>
            </div>

            {/* Like + actions */}
            <div className="flex items-center gap-6">
              {user && (
                <button
                  onClick={handleLike}
                  className={`p-2 rounded-full transition-colors ${
                    liked ? 'text-accent' : 'text-cream-muted hover:text-cream'
                  }`}
                >
                  {liked ? <IoHeart className={`text-xl ${likeAnimating ? 'like-pop' : ''}`} /> : <IoHeartOutline className="text-xl" />}
                </button>
              )}
            </div>
          </div>

          {/* Up next */}
          {upNext.length > 0 && (
            <div className="px-6 pb-6 max-w-lg mx-auto w-full">
              <p className="text-xs text-cream-muted mb-2 uppercase tracking-wider">Up next</p>
              <div className="space-y-1">
                {upNext.map((track, i) => (
                  <div
                    key={track.id + i}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-200/60 transition-colors cursor-pointer"
                    onClick={() => useQueueStore.getState().playIndex(currentIndex + 1 + i)}
                  >
                    <img src={track.thumbnail} alt="" className="w-9 h-9 rounded object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-cream truncate">{track.title}</p>
                      <p className="text-xs text-cream-muted truncate">{track.artist}</p>
                    </div>
                    <span className="text-xs text-cream-muted tabular-nums">{formatTime(track.duration)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NowPlayingProgress({
  position,
  duration,
  onSeek,
}: {
  position: number;
  duration: number;
  onSeek: (pos: number) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  const calcPosition = useCallback(
    (clientX: number) => {
      if (!barRef.current || !duration) return 0;
      const rect = barRef.current.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration;
    },
    [duration]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    onSeek(calcPosition(e.clientX));
    const handleMove = (e: MouseEvent) => onSeek(calcPosition(e.clientX));
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    onSeek(calcPosition(e.touches[0].clientX));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    onSeek(calcPosition(e.touches[0].clientX));
  };

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div
      ref={barRef}
      className="w-full h-1.5 bg-surface-300 rounded-full cursor-pointer group relative touch-none"
      style={{ padding: '10px 0', margin: '-10px 0', backgroundClip: 'content-box' }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div
        className="absolute inset-y-0 left-0 bg-accent rounded-full transition-colors"
        style={{ width: `${progress}%` }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-cream rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
        style={{ left: `calc(${progress}% - 8px)` }}
      />
    </div>
  );
}
