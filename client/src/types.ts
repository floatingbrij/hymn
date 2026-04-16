export interface Track {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  addedBy?: string;
}

export interface SearchResult {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
}

export interface JamState {
  id: string;
  hostId: string;
  participants: JamParticipant[];
  queue: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  playbackPosition: number;
  lastStateUpdate: number;
}

export interface JamParticipant {
  socketId: string;
  nickname: string;
  isHost: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface Playlist {
  id: number;
  name: string;
  track_count: number;
  created_at: string;
}

export interface PlaylistTrack {
  id: number;
  video_id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  position: number;
}
