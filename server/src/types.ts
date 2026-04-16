export interface Track {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  addedBy?: string;
}

export interface JamSession {
  id: string;
  hostId: string;
  participants: Map<string, Participant>;
  queue: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  playbackPosition: number;
  lastStateUpdate: number;
  createdAt: Date;
}

export interface Participant {
  socketId: string;
  nickname: string;
  isHost: boolean;
  joinedAt: Date;
}

export interface JamState {
  id: string;
  hostId: string;
  participants: { socketId: string; nickname: string; isHost: boolean }[];
  queue: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  playbackPosition: number;
  lastStateUpdate: number;
}

export interface SearchResult {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
}
