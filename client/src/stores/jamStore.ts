import { create } from 'zustand';
import type { JamState, JamParticipant, Track, SearchResult } from '../types';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { usePlayerStore } from './playerStore';
import { useQueueStore } from './queueStore';
import { generateTrackId } from '../utils/format';
import { audioEngine } from '../services/audioEngine';

interface JamStore {
  isInJam: boolean;
  jamId: string | null;
  isHost: boolean;
  mySocketId: string | null;
  participants: JamParticipant[];
  nickname: string;
  error: string | null;

  createJam: (nickname: string) => Promise<string | null>;
  joinJam: (code: string, nickname: string) => Promise<boolean>;
  leaveJam: () => void;
  setNickname: (name: string) => void;

  // Jam-aware actions (emit events instead of local-only)
  jamPlay: (position?: number) => void;
  jamPause: (position?: number) => void;
  jamSeek: (position: number) => void;
  jamNext: () => void;
  jamPrevious: () => void;
  jamAddTrack: (result: SearchResult) => void;
  jamRemoveTrack: (index: number) => void;
  jamReorderQueue: (oldIndex: number, newIndex: number) => void;
  jamPlayIndex: (index: number) => void;
}

export const useJamStore = create<JamStore>((set, get) => {
  let listenersAttached = false;

  function setupListeners() {
    const socket = getSocket();

    // Prevent duplicate listeners
    if (listenersAttached) return;
    listenersAttached = true;

    socket.on('jam:state-update', (state: JamState) => {
      applyJamState(state);
    });

    socket.on('jam:participant-joined', ({ participants }: { participants: JamParticipant[] }) => {
      set({ participants });
    });

    socket.on('jam:participant-left', ({ participants, newHostId }: { participants: JamParticipant[]; newHostId?: string }) => {
      set({ participants });
      if (newHostId && newHostId === get().mySocketId) {
        set({ isHost: true });
      }
    });

    socket.on('disconnect', () => {
      // Socket.IO will auto-reconnect; we handle rejoin on 'connect'
    });

    socket.on('connect', () => {
      const { isInJam, jamId, nickname } = get();
      set({ mySocketId: socket.id || null });

      // Auto-rejoin after reconnect
      if (isInJam && jamId) {
        socket.emit('jam:rejoin', { code: jamId, nickname }, (response: any) => {
          if (response?.success) {
            set({
              participants: response.jam.participants,
              isHost: response.jam.hostId === socket.id,
              error: null,
            });
            applyJamState(response.jam);
          } else {
            // Jam no longer exists — clean up
            set({
              isInJam: false,
              jamId: null,
              isHost: false,
              participants: [],
              error: null,
            });
          }
        });
      }
    });

    // Override track-end to use jam-aware next
    (usePlayerStore.getState() as any).onTrackEnd = () => {
      const { isInJam, isHost } = get();
      if (isInJam) {
        // Only host advances to prevent multiple clients from double-skipping
        if (isHost) {
          const { repeat } = useQueueStore.getState();
          if (repeat === 'one') {
            const socket = getSocket();
            socket.emit('jam:seek', { position: 0 });
            socket.emit('jam:play', { position: 0 });
          } else {
            getSocket().emit('jam:next');
          }
        }
        // Non-host clients wait for server's jam:state-update
      } else {
        const { repeat } = useQueueStore.getState();
        if (repeat === 'one') {
          const track = useQueueStore.getState().tracks[useQueueStore.getState().currentIndex];
          if (track) usePlayerStore.getState().loadAndPlay(track);
        } else {
          useQueueStore.getState().next();
        }
      }
    };
  }

  function applyJamState(state: JamState) {
    const playerStore = usePlayerStore.getState();

    // Update participants
    set({
      participants: state.participants,
      isHost: state.hostId === get().mySocketId,
    });

    // Update queue
    const tracks: Track[] = state.queue.map((t) => ({
      id: t.id || generateTrackId(),
      videoId: t.videoId,
      title: t.title,
      artist: t.artist,
      thumbnail: t.thumbnail,
      duration: t.duration,
      addedBy: t.addedBy,
    }));

    // Directly set queue state without triggering playback
    useQueueStore.setState({ tracks, currentIndex: state.currentTrackIndex });

    // Handle playback sync
    const currentTrack = tracks[state.currentTrackIndex];
    if (!currentTrack) {
      // Queue is empty or no valid track — stop playback
      if (playerStore.isPlaying) {
        playerStore.pause();
      }
      return;
    }

    const isNewTrack = playerStore.currentTrack?.videoId !== currentTrack.videoId;
    if (isNewTrack) {
      playerStore.loadAndPlay(currentTrack).then(() => {
        // Read FRESH state after async load (not stale closure)
        const ps = usePlayerStore.getState();
        if (ps.currentTrack?.videoId !== currentTrack.videoId) return;

        if (!state.isPlaying) {
          ps.pause();
        } else if (state.playbackPosition > 0.5) {
          ps.seek(state.playbackPosition);
        }
      });
    } else {
      // Same track — sync play/pause state
      if (state.isPlaying && !playerStore.isPlaying && !playerStore.isLoading) {
        // If audio engine has no loaded source (previous load failed), retry load
        if (playerStore.error || !audioEngine.isReady()) {
          playerStore.loadAndPlay(currentTrack);
        } else {
          playerStore.play();
        }
      } else if (!state.isPlaying && playerStore.isPlaying) {
        playerStore.pause();
      }

      // Correct drift (only when playing)
      if (state.isPlaying) {
        const drift = Math.abs(playerStore.position - state.playbackPosition);
        if (drift > 2) {
          playerStore.seek(state.playbackPosition);
        }
      }
    }
  }

  return {
    isInJam: false,
    jamId: null,
    isHost: false,
    mySocketId: null,
    participants: [],
    nickname: '',
    error: null,

    createJam: async (nickname) => {
      set({ error: null });
      // Unlock audio context during user gesture (button click)
      audioEngine.unlockAudio();
      const socket = connectSocket();
      set({ nickname, mySocketId: socket.id || null });
      setupListeners();

      // Wait for socket to connect before emitting
      if (!socket.connected) {
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('timeout')), 8000);
            socket.once('connect', () => { clearTimeout(timeout); resolve(); });
          });
          set({ mySocketId: socket.id || null });
        } catch {
          set({ error: 'Could not connect to server' });
          return null;
        }
      }

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          set({ error: 'Connection timed out' });
          resolve(null);
        }, 10000);

        socket.emit('jam:create', { nickname }, (response: any) => {
          clearTimeout(timeout);
          if (response.success) {
            set({
              isInJam: true,
              jamId: response.jam.id,
              isHost: true,
              participants: response.jam.participants,
              error: null,
            });

            // Sync current queue and playback state to the new jam
            const { tracks, currentIndex } = useQueueStore.getState();
            const { currentTrack, isPlaying: nowPlaying, position: nowPos } = usePlayerStore.getState();
            if (tracks.length > 0 && currentTrack) {
              socket.emit('jam:queue:sync', {
                tracks,
                currentIndex: Math.max(0, currentIndex),
                isPlaying: nowPlaying,
                position: nowPos,
              });
            }

            resolve(response.jam.id);
          } else {
            set({ error: response.error || 'Failed to create jam' });
            resolve(null);
          }
        });
      });
    },

    joinJam: async (code, nickname) => {
      set({ error: null });
      // Unlock audio context during user gesture (button click)
      audioEngine.unlockAudio();
      const socket = connectSocket();
      set({ nickname, mySocketId: socket.id || null });
      setupListeners();

      // Wait for socket to connect before emitting
      if (!socket.connected) {
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('timeout')), 8000);
            socket.once('connect', () => { clearTimeout(timeout); resolve(); });
          });
          set({ mySocketId: socket.id || null });
        } catch {
          set({ error: 'Could not connect to server' });
          return false;
        }
      }

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          set({ error: 'Connection timed out' });
          resolve(false);
        }, 10000);

        socket.emit('jam:join', { code: code.toUpperCase(), nickname }, (response: any) => {
          clearTimeout(timeout);
          if (response.success) {
            set({
              isInJam: true,
              jamId: response.jam.id,
              isHost: false,
              participants: response.jam.participants,
              error: null,
            });
            applyJamState(response.jam);
            resolve(true);
          } else {
            set({ error: response.error || 'Failed to join jam' });
            resolve(false);
          }
        });
      });
    },

    leaveJam: () => {
      const socket = getSocket();
      socket.emit('jam:leave');
      socket.removeAllListeners('jam:state-update');
      socket.removeAllListeners('jam:participant-joined');
      socket.removeAllListeners('jam:participant-left');
      listenersAttached = false;

      // Restore default (non-jam) track-end handler
      (usePlayerStore.getState() as any).onTrackEnd = () => {
        const { repeat } = useQueueStore.getState();
        if (repeat === 'one') {
          const track = useQueueStore.getState().tracks[useQueueStore.getState().currentIndex];
          if (track) usePlayerStore.getState().loadAndPlay(track);
        } else {
          useQueueStore.getState().next();
        }
      };

      disconnectSocket();
      set({
        isInJam: false,
        jamId: null,
        isHost: false,
        mySocketId: null,
        participants: [],
        error: null,
      });
    },

    setNickname: (name) => set({ nickname: name }),

    jamPlay: (position) => {
      getSocket().emit('jam:play', { position: position ?? usePlayerStore.getState().position });
    },

    jamPause: (position) => {
      getSocket().emit('jam:pause', { position: position ?? usePlayerStore.getState().position });
    },

    jamSeek: (position) => {
      getSocket().emit('jam:seek', { position });
    },

    jamNext: () => {
      getSocket().emit('jam:next');
    },

    jamPrevious: () => {
      getSocket().emit('jam:previous');
    },

    jamAddTrack: (result) => {
      const track: Track = {
        id: generateTrackId(),
        videoId: result.videoId,
        title: result.title,
        artist: result.artist,
        thumbnail: result.thumbnail,
        duration: result.duration,
      };
      getSocket().emit('jam:queue:add', { track });
    },

    jamRemoveTrack: (index) => {
      getSocket().emit('jam:queue:remove', { index });
    },

    jamReorderQueue: (oldIndex, newIndex) => {
      getSocket().emit('jam:queue:reorder', { oldIndex, newIndex });
    },

    jamPlayIndex: (index) => {
      getSocket().emit('jam:queue:play', { index });
    },
  };
});
