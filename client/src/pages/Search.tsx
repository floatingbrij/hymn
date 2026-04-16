import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchBar } from '../components/search/SearchBar';
import { TrackCard, TrackCardSkeleton } from '../components/search/TrackCard';
import { searchTracks } from '../services/api';
import type { SearchResult } from '../types';
import { IoMusicalNotesOutline, IoSearchOutline } from 'react-icons/io5';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (q: string) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await searchTracks(q);
      setResults(data);
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-8">
      <div>
        <h1 className="font-display text-2xl text-cream mb-4">Search</h1>
        <SearchBar value={query} onChange={setQuery} onSearch={handleSearch} />
      </div>

      {loading && (
        <div className="space-y-0.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <TrackCardSkeleton key={i} />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {!loading && results.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-0.5"
          >
            <p className="text-xs text-cream-muted mb-2">{results.length} results</p>
            {results.map((track, i) => (
              <motion.div
                key={track.videoId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4), ease: [0.25, 1, 0.5, 1] }}
              >
                <TrackCard track={track} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && hasSearched && results.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-xl bg-surface-200 flex items-center justify-center mb-4">
              <IoMusicalNotesOutline className="text-3xl text-cream-muted" />
            </div>
            <p className="font-display text-lg text-cream mb-1">Nothing turned up</p>
            <p className="text-sm text-cream-muted max-w-xs">Try different keywords or check the spelling. You can search by song title, artist, or lyrics.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {!hasSearched && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-xl bg-surface-200 flex items-center justify-center mb-4">
            <IoSearchOutline className="text-3xl text-cream-muted" />
          </div>
          <p className="text-base font-display text-cream mb-1">Find your next favorite song</p>
          <p className="text-sm text-cream-muted max-w-xs">Search by title, artist, or lyrics. Play instantly — no account needed.</p>
        </div>
      )}
    </motion.div>
  );
}
