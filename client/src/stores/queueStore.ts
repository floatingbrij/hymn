import { create } from 'zustand';
import type { Track, SearchResult } from '../types';
import { generateTrackId } from '../utils/format';
import { addToRecentlyPlayed } from '../pages/Home';
import { usePlayerStore } from './playerStore';

interface QueueState {
  tracks: Track[];
  currentIndex: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';

  addTrack: (result: SearchResult, addedBy?: string) => void;
  addAndPlay: (result: SearchResult, addedBy?: string) => void;
  removeTrack: (index: number) => void;
  clearQueue: () => void;
  reorder: (oldIndex: number, newIndex: number) => void;
  playIndex: (index: number) => void;
  next: () => void;
  previous: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setTracks: (tracks: Track[], startIndex?: number) => void;
}

export const useQueueStore = create<QueueState>((set, get) => {
  // Listen for track end to auto-advance
  (usePlayerStore as any).subscribe((state: any, prev: any) => {
    // Detect when onEnd fires (isPlaying goes false and position resets)
  });

  // Track end handler - called from playerStore
  (usePlayerStore.getState() as any).onTrackEnd = () => {
    const { repeat } = get();
    if (repeat === 'one') {
      const track = get().tracks[get().currentIndex];
      if (track) usePlayerStore.getState().loadAndPlay(track);
    } else {
      get().next();
    }
  };

  return {
    tracks: [],
    currentIndex: -1,
    shuffle: false,
    repeat: 'off',

    addTrack: (result, addedBy) => {
      const track: Track = {
        id: generateTrackId(),
        videoId: result.videoId,
        title: result.title,
        artist: result.artist,
        thumbnail: result.thumbnail,
        duration: result.duration,
        addedBy,
      };
      set((s) => ({ tracks: [...s.tracks, track] }));
    },

    addAndPlay: (result, addedBy) => {
      const track: Track = {
        id: generateTrackId(),
        videoId: result.videoId,
        title: result.title,
        artist: result.artist,
        thumbnail: result.thumbnail,
        duration: result.duration,
        addedBy,
      };
      addToRecentlyPlayed(result);
      set((s) => {
        const newTracks = [...s.tracks, track];
        const newIndex = newTracks.length - 1;
        return { tracks: newTracks, currentIndex: newIndex };
      });
      usePlayerStore.getState().loadAndPlay(track);
    },

    removeTrack: (index) => {
      set((s) => {
        const newTracks = [...s.tracks];
        newTracks.splice(index, 1);
        let newIndex = s.currentIndex;
        if (index < s.currentIndex) newIndex--;
        else if (index === s.currentIndex) {
          // If removing current track, stay at same index (plays next)
          if (newIndex >= newTracks.length) newIndex = newTracks.length - 1;
        }
        return { tracks: newTracks, currentIndex: newIndex };
      });
    },

    clearQueue: () => {
      set({ tracks: [], currentIndex: -1 });
    },

    reorder: (oldIndex, newIndex) => {
      set((s) => {
        const newTracks = [...s.tracks];
        const [item] = newTracks.splice(oldIndex, 1);
        newTracks.splice(newIndex, 0, item);

        let idx = s.currentIndex;
        if (s.currentIndex === oldIndex) {
          idx = newIndex;
        } else if (oldIndex < s.currentIndex && newIndex >= s.currentIndex) {
          idx--;
        } else if (oldIndex > s.currentIndex && newIndex <= s.currentIndex) {
          idx++;
        }

        return { tracks: newTracks, currentIndex: idx };
      });
    },

    playIndex: (index) => {
      const { tracks } = get();
      if (index >= 0 && index < tracks.length) {
        set({ currentIndex: index });
        usePlayerStore.getState().loadAndPlay(tracks[index]);
      }
    },

    next: () => {
      const { tracks, currentIndex, shuffle, repeat } = get();
      if (tracks.length === 0) return;

      let nextIndex: number;
      if (shuffle) {
        nextIndex = Math.floor(Math.random() * tracks.length);
      } else if (currentIndex < tracks.length - 1) {
        nextIndex = currentIndex + 1;
      } else if (repeat === 'all') {
        nextIndex = 0;
      } else {
        return; // End of queue
      }

      set({ currentIndex: nextIndex });
      usePlayerStore.getState().loadAndPlay(tracks[nextIndex]);
    },

    previous: () => {
      const { tracks, currentIndex } = get();
      if (tracks.length === 0) return;

      // If more than 3 seconds in, restart current track
      const position = usePlayerStore.getState().position;
      if (position > 3) {
        usePlayerStore.getState().seek(0);
        return;
      }

      const prevIndex = Math.max(0, currentIndex - 1);
      set({ currentIndex: prevIndex });
      usePlayerStore.getState().loadAndPlay(tracks[prevIndex]);
    },

    toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),

    cycleRepeat: () =>
      set((s) => ({
        repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
      })),

    setTracks: (tracks, startIndex = 0) => {
      set({ tracks, currentIndex: startIndex });
      if (tracks.length > 0 && startIndex >= 0) {
        usePlayerStore.getState().loadAndPlay(tracks[startIndex]);
      }
    },
  };
});
