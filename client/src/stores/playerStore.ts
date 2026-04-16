import { create } from 'zustand';
import type { Track } from '../types';
import { audioEngine } from '../services/audioEngine';

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  volume: number;
  error: string | null;

  setTrack: (track: Track) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (position: number) => void;
  setVolume: (vol: number) => void;
  setPosition: (pos: number) => void;
  setDuration: (dur: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  loadAndPlay: (track: Track) => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  // Wire up audio engine callbacks
  audioEngine.onPlay(() => set({ isPlaying: true, isLoading: false, error: null }));
  audioEngine.onPause(() => set({ isPlaying: false }));
  audioEngine.onProgress((pos, dur) => set({ position: pos, duration: dur }));
  audioEngine.onError((error) => set({ error, isLoading: false }));
  audioEngine.onLoad(() => set({ isLoading: false }));
  audioEngine.onEnd(() => {
    set({ isPlaying: false, position: 0 });
    // Auto-advance handled by queue store
    const { onTrackEnd } = usePlayerStore.getState() as any;
    if (onTrackEnd) onTrackEnd();
  });

  return {
    currentTrack: null,
    isPlaying: false,
    isLoading: false,
    position: 0,
    duration: 0,
    volume: 0.7,
    error: null,

    setTrack: (track) => set({ currentTrack: track, position: 0, duration: 0 }),

    play: () => {
      audioEngine.play();
    },

    pause: () => {
      audioEngine.pause();
    },

    togglePlay: () => {
      if (get().isPlaying) {
        audioEngine.pause();
      } else {
        audioEngine.play();
      }
    },

    seek: (position) => {
      audioEngine.seek(position);
      set({ position });
    },

    setVolume: (vol) => {
      audioEngine.setVolume(vol);
      set({ volume: vol });
    },

    setPosition: (pos) => set({ position: pos }),
    setDuration: (dur) => set({ duration: dur }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),

    loadAndPlay: async (track) => {
      set({ currentTrack: track, isLoading: true, error: null, position: 0, duration: 0 });
      try {
        await audioEngine.load(track.videoId);
        audioEngine.setVolume(get().volume);
        audioEngine.play();
      } catch (err: any) {
        set({ error: err.message || 'Failed to load track', isLoading: false });
      }
    },
  };
});
