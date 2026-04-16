import { Server, Socket } from 'socket.io';
import {
  createSession,
  getSession,
  getAllSessions,
  getSessionState,
  findSessionBySocket,
  deleteSession,
  getCurrentPosition,
} from './syncEngine.js';
import type { Track } from '../types.js';

export function initJamHandler(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // ── Create Jam ──
    socket.on('jam:create', ({ nickname }: { nickname: string }, callback) => {
      // Leave any existing jam first
      leaveCurrentJam(io, socket);

      const session = createSession(socket.id, nickname || 'Host');
      socket.join(`jam:${session.id}`);

      callback?.({ success: true, jam: getSessionState(session) });
      console.log(`Jam created: ${session.id} by ${nickname}`);
    });

    // ── Join Jam ──
    socket.on('jam:join', ({ code, nickname }: { code: string; nickname: string }, callback) => {
      const session = getSession(code.toUpperCase());
      if (!session) {
        callback?.({ success: false, error: 'Jam session not found' });
        return;
      }

      // Leave any existing jam first
      leaveCurrentJam(io, socket);

      session.participants.set(socket.id, {
        socketId: socket.id,
        nickname: nickname || 'Listener',
        isHost: false,
        joinedAt: new Date(),
      });

      socket.join(`jam:${session.id}`);
      const state = getSessionState(session);

      callback?.({ success: true, jam: state });

      // Notify all participants
      socket.to(`jam:${session.id}`).emit('jam:participant-joined', {
        socketId: socket.id,
        nickname: nickname || 'Listener',
        participants: state.participants,
      });

      console.log(`${nickname} joined jam: ${session.id}`);
    });

    // ── Leave Jam ──
    socket.on('jam:leave', () => {
      leaveCurrentJam(io, socket);
    });

    // ── Play ──
    socket.on('jam:play', ({ position }: { position?: number }) => {
      const session = findSessionBySocket(socket.id);
      if (!session) return;

      session.isPlaying = true;
      session.playbackPosition = position ?? getCurrentPosition(session);
      session.lastStateUpdate = Date.now();

      io.to(`jam:${session.id}`).emit('jam:state-update', getSessionState(session));
    });

    // ── Pause ──
    socket.on('jam:pause', ({ position }: { position?: number }) => {
      const session = findSessionBySocket(socket.id);
      if (!session) return;

      session.isPlaying = false;
      session.playbackPosition = position ?? getCurrentPosition(session);
      session.lastStateUpdate = Date.now();

      io.to(`jam:${session.id}`).emit('jam:state-update', getSessionState(session));
    });

    // ── Seek ──
    socket.on('jam:seek', ({ position }: { position: number }) => {
      const session = findSessionBySocket(socket.id);
      if (!session) return;

      session.playbackPosition = position;
      session.lastStateUpdate = Date.now();

      io.to(`jam:${session.id}`).emit('jam:state-update', getSessionState(session));
    });

    // ── Skip / Next ──
    socket.on('jam:next', () => {
      const session = findSessionBySocket(socket.id);
      if (!session) return;

      if (session.currentTrackIndex < session.queue.length - 1) {
        session.currentTrackIndex++;
        session.playbackPosition = 0;
        session.lastStateUpdate = Date.now();
        session.isPlaying = true;

        io.to(`jam:${session.id}`).emit('jam:state-update', getSessionState(session));
      } else {
        // End of queue
        session.isPlaying = false;
        session.playbackPosition = 0;
        session.lastStateUpdate = Date.now();
        io.to(`jam:${session.id}`).emit('jam:state-update', getSessionState(session));
      }
    });

    // ── Previous ──
    socket.on('jam:previous', () => {
      const session = findSessionBySocket(socket.id);
      if (!session) return;

      if (session.currentTrackIndex > 0) {
        session.currentTrackIndex--;
        session.playbackPosition = 0;
        session.lastStateUpdate = Date.now();
        session.isPlaying = true;

        io.to(`jam:${session.id}`).emit('jam:state-update', getSessionState(session));
      }
    });

    // ── Add to Queue ──
    socket.on('jam:queue:add', ({ track }: { track: Track }) => {
      const session = findSessionBySocket(socket.id);
      if (!session) return;

      const participant = session.participants.get(socket.id);
      const trackWithUser = { ...track, addedBy: participant?.nickname || 'Unknown' };
      session.queue.push(trackWithUser);

      // If this is the first track, set current index and auto-play
      if (session.queue.length === 1) {
        session.currentTrackIndex = 0;
        session.isPlaying = true;
        session.playbackPosition = 0;
        session.lastStateUpdate = Date.now();
      }

      io.to(`jam:${session.id}`).emit('jam:state-update', getSessionState(session));
    });

    // ── Remove from Queue ──
    socket.on('jam:queue:remove', ({ index }: { index: number }) => {
      const session = findSessionBySocket(socket.id);
      if (!session) return;
      if (index < 0 || index >= session.queue.length) return;

      session.queue.splice(index, 1);

      // Adjust current track index
      if (session.queue.length === 0) {
        session.currentTrackIndex = -1;
        session.isPlaying = false;
        session.playbackPosition = 0;
        session.lastStateUpdate = Date.now();
      } else if (index < session.currentTrackIndex) {
        session.currentTrackIndex--;
      } else if (index === session.currentTrackIndex) {
        session.playbackPosition = 0;
        session.lastStateUpdate = Date.now();
        if (session.currentTrackIndex >= session.queue.length) {
          session.currentTrackIndex = session.queue.length - 1;
          session.isPlaying = false;
        }
      }

      io.to(`jam:${session.id}`).emit('jam:state-update', getSessionState(session));
    });

    // ── Reorder Queue ──
    socket.on('jam:queue:reorder', ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => {
      const session = findSessionBySocket(socket.id);
      if (!session) return;
      if (oldIndex < 0 || oldIndex >= session.queue.length) return;
      if (newIndex < 0 || newIndex >= session.queue.length) return;

      const [item] = session.queue.splice(oldIndex, 1);
      session.queue.splice(newIndex, 0, item);

      // Adjust current track index to follow the currently playing track
      if (session.currentTrackIndex === oldIndex) {
        session.currentTrackIndex = newIndex;
      } else if (oldIndex < session.currentTrackIndex && newIndex >= session.currentTrackIndex) {
        session.currentTrackIndex--;
      } else if (oldIndex > session.currentTrackIndex && newIndex <= session.currentTrackIndex) {
        session.currentTrackIndex++;
      }

      io.to(`jam:${session.id}`).emit('jam:state-update', getSessionState(session));
    });

    // ── Play specific track in queue ──
    socket.on('jam:queue:play', ({ index }: { index: number }) => {
      const session = findSessionBySocket(socket.id);
      if (!session) return;
      if (index < 0 || index >= session.queue.length) return;

      session.currentTrackIndex = index;
      session.playbackPosition = 0;
      session.lastStateUpdate = Date.now();
      session.isPlaying = true;

      io.to(`jam:${session.id}`).emit('jam:state-update', getSessionState(session));
    });

    // ── Disconnect ──
    socket.on('disconnect', () => {
      leaveCurrentJam(io, socket);
      console.log(`Client disconnected: ${socket.id}`);
    });

    // ── Rejoin after reconnect ──
    socket.on('jam:rejoin', ({ code, nickname }: { code: string; nickname: string }, callback) => {
      const session = getSession(code);
      if (!session) {
        callback?.({ success: false, error: 'Jam session no longer exists' });
        return;
      }

      // Leave any previous jam this socket may be in
      leaveCurrentJam(io, socket);

      session.participants.set(socket.id, {
        socketId: socket.id,
        nickname: nickname || 'Listener',
        isHost: session.hostId === socket.id,
        joinedAt: new Date(),
      });

      socket.join(`jam:${session.id}`);
      const state = getSessionState(session);
      callback?.({ success: true, jam: state });

      socket.to(`jam:${session.id}`).emit('jam:participant-joined', {
        socketId: socket.id,
        nickname: nickname || 'Listener',
        participants: state.participants,
      });

      console.log(`${nickname} rejoined jam: ${session.id}`);
    });
  });

  // Periodic sync broadcast every 5 seconds for drift correction
  setInterval(() => {
    const allSessions = getAllSessions();
    for (const session of allSessions) {
      if (session.participants.size > 0 && session.isPlaying) {
        io.to(`jam:${session.id}`).emit('jam:state-update', getSessionState(session));
      }
    }
  }, 5000);
}

function leaveCurrentJam(io: Server, socket: Socket) {
  const session = findSessionBySocket(socket.id);
  if (!session) return;

  const wasHost = session.hostId === socket.id;
  session.participants.delete(socket.id);
  socket.leave(`jam:${session.id}`);

  if (session.participants.size === 0) {
    deleteSession(session.id);
    console.log(`Jam session ${session.id} deleted (empty)`);
    return;
  }

  // Transfer host
  if (wasHost) {
    const newHost = session.participants.values().next().value;
    if (newHost) {
      newHost.isHost = true;
      session.hostId = newHost.socketId;
    }
  }

  const state = getSessionState(session);
  io.to(`jam:${session.id}`).emit('jam:participant-left', {
    socketId: socket.id,
    participants: state.participants,
    newHostId: wasHost ? session.hostId : undefined,
  });
}
