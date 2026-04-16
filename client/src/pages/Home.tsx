import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { IoTrendingUpOutline, IoMusicalNotesOutline, IoTimeOutline, IoSearchOutline } from 'react-icons/io5';
import { getTrending } from '../services/api';
import { TrackCard, TrackCardSkeleton } from '../components/search/TrackCard';
import type { SearchResult } from '../types';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../stores/playerStore';
import { useQueueStore } from '../stores/queueStore';

// Persist recently played to localStorage
function getRecentlyPlayed(): SearchResult[] {
  try {
    return JSON.parse(localStorage.getItem('hymn-recent') || '[]');
  } catch { return []; }
}

export function addToRecentlyPlayed(track: SearchResult) {
  const recent = getRecentlyPlayed().filter((t) => t.videoId !== track.videoId);
  recent.unshift(track);
  localStorage.setItem('hymn-recent', JSON.stringify(recent.slice(0, 20)));
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Late night listening';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Night owl mode';
}

export function HomePage() {
  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const recentlyPlayed = useMemo(() => getRecentlyPlayed(), []);
  const greeting = useMemo(() => getGreeting(), []);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  useEffect(() => {
    getTrending()
      .then(setTrending)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-8">
      {/* Hero */}
      <motion.div
        className="pt-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
      >
        <p className="text-cream-muted text-sm mb-1 tracking-wide uppercase">{greeting}</p>
        <h1 className="font-display text-3xl md:text-4xl text-cream mb-2">What are we playing?</h1>
        <p className="text-cream-dim text-base mb-6 max-w-md">Stream ad-free. Start a jam with friends. No accounts needed.</p>
        <motion.div
          className="flex gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 1, 0.5, 1] }}
        >
          <button
            onClick={() => navigate('/search')}
            className="btn-primary flex items-center gap-2"
          >
            <IoSearchOutline /> Find Music
          </button>
          <button
            onClick={() => navigate('/jam')}
            className="btn-ghost flex items-center gap-2"
          >
            <IoMusicalNotesOutline /> Start a Jam
          </button>
        </motion.div>
      </motion.div>

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 1, 0.5, 1] }}
        >
          <h2 className="font-display text-xl text-cream flex items-center gap-2 mb-4">
            <IoTimeOutline className="text-cream-dim" />
            Recently Played
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {recentlyPlayed.slice(0, 8).map((track, i) => (
              <motion.button
                key={track.videoId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.25 + i * 0.05, ease: [0.25, 1, 0.5, 1] }}
                onClick={() => useQueueStore.getState().addAndPlay(track)}
                className="flex items-center gap-3 panel panel-hover rounded-lg p-2.5 text-left group"
              >
                <img
                  src={track.thumbnail}
                  alt={track.title}
                  className="w-10 h-10 rounded object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-cream font-medium truncate">{track.title}</p>
                  <p className="text-xs text-cream-muted truncate">{track.artist}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Trending */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 1, 0.5, 1] }}
      >
        <h2 className="font-display text-xl text-cream flex items-center gap-2 mb-4">
          <IoTrendingUpOutline className="text-accent" />
          Trending Now
        </h2>
        <div className="space-y-0.5">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <TrackCardSkeleton key={i} />)
            : trending.map((track, i) => <TrackCard key={track.videoId} track={track} index={i} showIndex />)}
          {!loading && trending.length === 0 && (
            <div className="panel rounded-xl p-8 text-center">
              <IoMusicalNotesOutline className="text-4xl text-cream-muted mx-auto mb-3" />
              <p className="text-cream-dim font-display text-lg mb-1">Couldn't load trending tracks</p>
              <p className="text-cream-muted text-sm mb-4">This happens sometimes. Try searching directly.</p>
              <button onClick={() => navigate('/search')} className="btn-primary">
                Search instead
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Keyboard shortcuts hint — hidden on mobile */}
      <motion.div
        className="hidden md:block border-t border-surface-400/30 pt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6, ease: [0.25, 1, 0.5, 1] }}
      >
        <p className="text-xs text-cream-muted mb-2">Keyboard shortcuts</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-cream-muted">
          <span><kbd className="px-1.5 py-0.5 rounded bg-surface-200 text-cream-dim text-[10px] font-mono">Space</kbd> Play/Pause</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-surface-200 text-cream-dim text-[10px] font-mono">Shift+→</kbd> Next</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-surface-200 text-cream-dim text-[10px] font-mono">Shift+←</kbd> Previous</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-surface-200 text-cream-dim text-[10px] font-mono">Shift+↑/↓</kbd> Volume</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
