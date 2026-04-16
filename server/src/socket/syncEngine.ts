import type { JamSession, JamState } from '../types.js';

// In-memory store for jam sessions
const sessions = new Map<string, JamSession>();

// Cleanup interval: remove sessions older than 24h or empty for 30min
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    const age = now - session.createdAt.getTime();
    const empty = session.participants.size === 0;
    if (age > 24 * 60 * 60 * 1000 || (empty && age > 30 * 60 * 1000)) {
      sessions.delete(id);
      console.log(`Cleaned up jam session: ${id}`);
    }
  }
}, 60000);

export function createSession(hostSocketId: string, nickname: string): JamSession {
  const id = generateCode();
  const session: JamSession = {
    id,
    hostId: hostSocketId,
    participants: new Map(),
    queue: [],
    currentTrackIndex: -1,
    isPlaying: false,
    playbackPosition: 0,
    lastStateUpdate: Date.now(),
    createdAt: new Date(),
  };

  session.participants.set(hostSocketId, {
    socketId: hostSocketId,
    nickname,
    isHost: true,
    joinedAt: new Date(),
  });

  sessions.set(id, session);
  return session;
}

export function getSession(id: string): JamSession | undefined {
  return sessions.get(id);
}

export function getAllSessions(): JamSession[] {
  return Array.from(sessions.values());
}

export function deleteSession(id: string): void {
  sessions.delete(id);
}

export function getSessionState(session: JamSession): JamState {
  return {
    id: session.id,
    hostId: session.hostId,
    participants: Array.from(session.participants.values()).map((p) => ({
      socketId: p.socketId,
      nickname: p.nickname,
      isHost: p.isHost,
    })),
    queue: session.queue,
    currentTrackIndex: session.currentTrackIndex,
    isPlaying: session.isPlaying,
    playbackPosition: getCurrentPosition(session),
    lastStateUpdate: Date.now(),
  };
}

export function getCurrentPosition(session: JamSession): number {
  if (!session.isPlaying) return session.playbackPosition;
  const elapsed = (Date.now() - session.lastStateUpdate) / 1000;
  return session.playbackPosition + elapsed;
}

export function findSessionBySocket(socketId: string): JamSession | undefined {
  for (const session of sessions.values()) {
    if (session.participants.has(socketId)) {
      return session;
    }
  }
  return undefined;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  // Ensure uniqueness
  if (sessions.has(code)) return generateCode();
  return code;
}
