import { useState, useRef, useEffect } from 'react';
import {
  IoPlaySharp,
  IoAddOutline,
  IoHeartOutline,
  IoHeart,
  IoEllipsisHorizontal,
  IoMusicalNotesOutline,
  IoListOutline,
} from 'react-icons/io5';
import type { SearchResult, Playlist } from '../../types';
import { useQueueStore } from '../../stores/queueStore';
import { useJamStore } from '../../stores/jamStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useAuthStore } from '../../stores/authStore';
import { formatDuration } from '../../utils/format';
import * as api from '../../services/api';
import toast from 'react-hot-toast';

interface TrackCardProps {
  track: SearchResult;
  index?: number;
  showIndex?: boolean;
}

// Global liked tracks cache
let likedVideoIds: Set<string> = new Set();
let likedLoaded = false;

export function refreshLikedCache() {
  api.getLikedTracks()
    .then((tracks) => {
      likedVideoIds = new Set(tracks.map((t: any) => t.video_id));
      likedLoaded = true;
    })
    .catch(() => {});
}

export function TrackCard({ track, index, showIndex }: TrackCardProps) {
  const { isInJam } = useJamStore();
  const { user } = useAuthStore();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const [liked, setLiked] = useState(likedVideoIds.has(track.videoId));
  const [menuOpen, setMenuOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isActive = currentTrack?.videoId === track.videoId;
  const isCurrentlyPlaying = isActive && isPlaying;
  const isCurrentlyLoading = isActive && isLoading;

  // Load liked tracks cache on first render
  useEffect(() => {
    if (user && !likedLoaded) refreshLikedCache();
  }, [user]);

  // Sync liked state from cache
  useEffect(() => {
    setLiked(likedVideoIds.has(track.videoId));
  }, [track.videoId]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setShowPlaylists(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handlePlay = () => {
    if (isInJam) {
      useJamStore.getState().jamAddTrack(track);
      toast.success('Added to jam queue');
    } else {
      useQueueStore.getState().addAndPlay(track);
    }
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInJam) {
      useJamStore.getState().jamAddTrack(track);
      toast.success('Added to jam queue');
    } else {
      useQueueStore.getState().addTrack(track);
      toast.success('Added to queue');
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Sign in to like songs');
      return;
    }
    try {
      if (liked) {
        await api.unlikeTrack(track.videoId);
        likedVideoIds.delete(track.videoId);
        setLiked(false);
      } else {
        await api.likeTrack(track);
        likedVideoIds.add(track.videoId);
        setLiked(true);
        setLikeAnimating(true);
        setTimeout(() => setLikeAnimating(false), 350);
      }
    } catch {
      toast.error('Failed to update liked songs');
    }
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menuOpen) {
      // Pre-load playlists
      if (user) api.getPlaylists().then(setPlaylists).catch(() => {});
    }
    setMenuOpen(!menuOpen);
    setShowPlaylists(false);
  };

  const handleAddToPlaylist = async (playlistId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.addToPlaylist(playlistId, track);
      toast.success('Added to playlist');
      setMenuOpen(false);
      setShowPlaylists(false);
    } catch {
      toast.error('Failed to add to playlist');
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer group transition-colors duration-150 relative ${
        isActive ? 'bg-accent/8' : 'hover:bg-surface-200/80'
      }`}
      onClick={handlePlay}
    >
      {/* Index or playing indicator */}
      {showIndex && (
        <div className="w-6 text-center shrink-0">
          {isCurrentlyPlaying ? (
            <EqBars />
          ) : isCurrentlyLoading ? (
            <div className="w-3.5 h-3.5 border-2 border-accent/40 border-t-accent rounded-full animate-spin mx-auto" />
          ) : (
            <span className="text-xs text-cream-muted tabular-nums group-hover:hidden">
              {(index ?? 0) + 1}
            </span>
          )}
          {!isActive && (
            <IoPlaySharp className="text-cream text-xs hidden group-hover:block mx-auto" />
          )}
        </div>
      )}

      {/* Thumbnail with play overlay */}
      <div className="relative shrink-0 group/thumb">
        <img
          src={track.thumbnail}
          alt={track.title}
          className={`w-11 h-11 rounded object-cover transition-all duration-200 ${
            isCurrentlyLoading ? 'opacity-60' : 'group-hover/thumb:scale-105'
          }`}
        />
        <div
          className={`absolute inset-0 bg-surface/60 rounded flex items-center justify-center transition-opacity ${
            isCurrentlyPlaying
              ? 'opacity-100'
              : isCurrentlyLoading
              ? 'opacity-100'
              : 'opacity-0 md:group-hover:opacity-100'
          }`}
        >
          {isCurrentlyLoading ? (
            <div className="w-4 h-4 border-2 border-cream/40 border-t-cream rounded-full animate-spin" />
          ) : isCurrentlyPlaying ? (
            <EqBars />
          ) : (
            <IoPlaySharp className="text-cream text-base" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium truncate transition-colors ${
            isActive ? 'text-accent' : 'text-cream group-hover:text-accent-light'
          }`}
        >
          {track.title}
        </p>
        <p className="text-xs text-cream-muted truncate">{track.artist}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Like button */}
        <button
          onClick={handleLike}
          className={`p-1.5 rounded transition-all ${
            liked
              ? 'text-accent opacity-100'
              : 'text-cream-muted hover:text-cream md:opacity-0 md:group-hover:opacity-100'
          }`}
          title={liked ? 'Unlike' : 'Like'}
        >
          {liked ? <IoHeart className={`text-base ${likeAnimating ? 'like-pop' : ''}`} /> : <IoHeartOutline className="text-base" />}
        </button>

        <span className="text-xs text-cream-muted tabular-nums mx-1">{formatDuration(track.duration)}</span>

        {/* Add to queue */}
        <button
          onClick={handleAddToQueue}
          className="p-1.5 rounded text-cream-muted hover:text-cream hover:bg-surface-300/60 md:opacity-0 md:group-hover:opacity-100 transition-all"
          title="Add to queue"
        >
          <IoAddOutline className="text-lg" />
        </button>

        {/* Context menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={handleMenuToggle}
            className="p-1.5 rounded text-cream-muted hover:text-cream hover:bg-surface-300/60 md:opacity-0 md:group-hover:opacity-100 transition-all"
            title="More options"
          >
            <IoEllipsisHorizontal className="text-lg" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-surface-100 border border-surface-400 rounded-lg overflow-hidden z-50 shadow-lg shadow-black/30 scale-in">
              {!showPlaylists ? (
                <>
                  <button
                    onClick={handleAddToQueue}
                    className="w-full text-left px-4 py-2.5 text-sm text-cream-dim hover:bg-surface-200/60 hover:text-cream flex items-center gap-3 transition-colors"
                  >
                    <IoListOutline className="text-base" /> Add to queue
                  </button>
                  <button
                    onClick={handleLike}
                    className="w-full text-left px-4 py-2.5 text-sm text-cream-dim hover:bg-surface-200/60 hover:text-cream flex items-center gap-3 transition-colors"
                  >
                    {liked ? (
                      <><IoHeart className="text-base text-accent" /> Remove from liked</>
                    ) : (
                      <><IoHeartOutline className="text-base" /> Like this song</>
                    )}
                  </button>
                  {user && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowPlaylists(true); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-cream-dim hover:bg-surface-200/60 hover:text-cream flex items-center gap-3 transition-colors"
                    >
                      <IoMusicalNotesOutline className="text-base" /> Add to playlist
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="px-4 py-2 text-xs text-cream-muted border-b border-surface-400/50">
                    Add to playlist
                  </div>
                  {playlists.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-cream-muted">No playlists yet</p>
                  ) : (
                    playlists.map((p) => (
                      <button
                        key={p.id}
                        onClick={(e) => handleAddToPlaylist(p.id, e)}
                        className="w-full text-left px-4 py-2.5 text-sm text-cream-dim hover:bg-surface-200/60 hover:text-cream transition-colors truncate"
                      >
                        {p.name}
                      </button>
                    ))
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowPlaylists(false); }}
                    className="w-full text-left px-4 py-2 text-xs text-cream-muted hover:text-cream transition-colors border-t border-surface-400/50"
                  >
                    ← Back
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Mini equalizer bars animation for "now playing" */
function EqBars() {
  return (
    <div className="flex items-end justify-center gap-[3px] h-3.5">
      <span className="w-[3px] bg-accent rounded-full animate-eq-1" />
      <span className="w-[3px] bg-accent rounded-full animate-eq-2" />
      <span className="w-[3px] bg-accent rounded-full animate-eq-3" />
    </div>
  );
}

export function TrackCardSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
      <div className="w-11 h-11 rounded bg-surface-200" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-surface-200 rounded w-3/4" />
        <div className="h-2.5 bg-surface-200 rounded w-1/2" />
      </div>
      <div className="h-3 bg-surface-200 rounded w-12" />
    </div>
  );
}
