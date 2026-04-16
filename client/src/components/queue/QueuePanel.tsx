import { motion, AnimatePresence } from 'framer-motion';
import { IoCloseOutline, IoTrashOutline, IoMusicalNotesOutline } from 'react-icons/io5';
import { useQueueStore } from '../../stores/queueStore';
import { useJamStore } from '../../stores/jamStore';
import { usePlayerStore } from '../../stores/playerStore';
import { formatTime } from '../../utils/format';

interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QueuePanel({ isOpen, onClose }: QueuePanelProps) {
  const { tracks, currentIndex } = useQueueStore();
  const { isInJam } = useJamStore();
  const { currentTrack } = usePlayerStore();

  const handlePlay = (index: number) => {
    if (isInJam) {
      useJamStore.getState().jamPlayIndex(index);
    } else {
      useQueueStore.getState().playIndex(index);
    }
  };

  const handleRemove = (index: number) => {
    if (isInJam) {
      useJamStore.getState().jamRemoveTrack(index);
    } else {
      useQueueStore.getState().removeTrack(index);
    }
  };

  const handleClear = () => {
    if (!isInJam) {
      useQueueStore.getState().clearQueue();
    }
  };

  const queueContent = (
    <>
      {tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <div className="w-14 h-14 rounded-xl bg-surface-200 flex items-center justify-center mb-4">
            <IoMusicalNotesOutline className="text-2xl text-cream-muted" />
          </div>
          <p className="text-sm font-display text-cream mb-1">Queue is empty</p>
          <p className="text-xs text-cream-muted">Search for songs and tap play or the + button to add them here.</p>
        </div>
      ) : (
        <div className="p-2 space-y-0.5">
          {tracks.map((track, i) => {
            const isCurrent = i === currentIndex;
            return (
              <div
                key={track.id + i}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors group ${
                  isCurrent ? 'bg-accent/10' : 'hover:bg-surface-200/60'
                }`}
                onClick={() => handlePlay(i)}
              >
                <div className="w-5 text-center shrink-0">
                  {isCurrent ? (
                    <div className="flex items-end justify-center gap-0.5 h-4">
                      <div className="w-0.5 bg-accent animate-pulse rounded-full" style={{ height: '100%' }} />
                      <div className="w-0.5 bg-accent animate-pulse rounded-full" style={{ height: '60%', animationDelay: '0.2s' }} />
                      <div className="w-0.5 bg-accent animate-pulse rounded-full" style={{ height: '80%', animationDelay: '0.4s' }} />
                    </div>
                  ) : (
                    <span className="text-xs text-cream-muted">{i + 1}</span>
                  )}
                </div>
                <img
                  src={track.thumbnail}
                  alt={track.title}
                  className="w-10 h-10 rounded object-cover shrink-0 transition-transform duration-200 group-hover:scale-105"
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm truncate ${isCurrent ? 'text-accent' : 'text-cream'}`}>
                    {track.title}
                  </p>
                  <p className="text-xs text-cream-muted truncate">
                    {track.artist}
                    {track.addedBy && (
                      <span className="text-cream-muted/50"> · Added by {track.addedBy}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-cream-muted">{formatTime(track.duration)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(i);
                    }}
                    className="md:opacity-0 md:group-hover:opacity-100 text-cream-muted hover:text-red-400 transition-all"
                  >
                    <IoTrashOutline className="text-sm" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  const headerContent = (
    <div className="flex items-center justify-between p-4 border-b border-surface-400/40">
      <h2 className="text-sm font-semibold text-cream">Queue</h2>
      <div className="flex items-center gap-2">
        {!isInJam && tracks.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-cream-muted hover:text-cream-dim transition-colors"
          >
            Clear
          </button>
        )}
        <button onClick={onClose} className="p-2 text-cream-muted hover:text-cream transition-colors">
          <IoCloseOutline className="text-xl" />
        </button>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile: fullscreen overlay */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            className="md:hidden fixed inset-0 z-[55] bg-surface flex flex-col"
          >
            {headerContent}
            <div className="flex-1 overflow-y-auto">{queueContent}</div>
          </motion.div>

          {/* Desktop: side panel */}
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
            className="hidden md:flex h-full bg-surface-50 border-l border-surface-400/40 flex-col overflow-hidden shrink-0"
            style={{ marginBottom: '80px' }}
          >
            {headerContent}
            <div className="flex-1 overflow-y-auto">{queueContent}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
