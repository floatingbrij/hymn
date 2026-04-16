import type { SearchResult } from '../types';

const BASE = '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('hymn-token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Search
export const searchTracks = (q: string) =>
  apiFetch<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`);

export const searchSuggestions = (q: string) =>
  apiFetch<string[]>(`/search/suggestions?q=${encodeURIComponent(q)}`);

export const getTrending = () =>
  apiFetch<SearchResult[]>('/search/trending');

// Stream
export const getStreamInfo = (videoId: string) =>
  apiFetch<{
    title: string;
    uploader: string;
    thumbnail: string;
    duration: number;
    bestAudioUrl: string | null;
    audioStreams: any[];
  }>(`/stream/info/${videoId}`);

export function getStreamUrl(videoId: string): string {
  return `${BASE}/stream/audio/${videoId}`;
}

// Auth
export const register = (email: string, username: string, password: string) =>
  apiFetch<{ token: string; user: { id: number; username: string; email: string } }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, username, password }),
  });

export const login = (email: string, password: string) =>
  apiFetch<{ token: string; user: { id: number; username: string; email: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const getMe = () =>
  apiFetch<{ id: number; username: string; email: string }>('/auth/me');

export const googleAuth = (idToken: string) =>
  apiFetch<{ token: string; user: { id: number; username: string; email: string } }>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });

// Playlists
export const getPlaylists = () => apiFetch<any[]>('/playlists');

export const createPlaylist = (name: string) =>
  apiFetch<any>('/playlists', { method: 'POST', body: JSON.stringify({ name }) });

export const getPlaylistTracks = (id: number) =>
  apiFetch<any[]>(`/playlists/${id}/tracks`);

export const addToPlaylist = (playlistId: number, track: SearchResult) =>
  apiFetch<any>(`/playlists/${playlistId}/tracks`, {
    method: 'POST',
    body: JSON.stringify({
      videoId: track.videoId,
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail,
      duration: track.duration,
    }),
  });

export const removeFromPlaylist = (playlistId: number, trackId: number) =>
  apiFetch<any>(`/playlists/${playlistId}/tracks/${trackId}`, { method: 'DELETE' });

export const deletePlaylist = (id: number) =>
  apiFetch<any>(`/playlists/${id}`, { method: 'DELETE' });

// Liked tracks
export const getLikedTracks = () => apiFetch<any[]>('/playlists/liked/tracks');

export const likeTrack = (track: SearchResult) =>
  apiFetch<any>('/playlists/liked/tracks', {
    method: 'POST',
    body: JSON.stringify({
      videoId: track.videoId,
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail,
      duration: track.duration,
    }),
  });

export const unlikeTrack = (videoId: string) =>
  apiFetch<any>(`/playlists/liked/tracks/${videoId}`, { method: 'DELETE' });

// Spotify import
export const importSpotifyPlaylist = (url: string) =>
  apiFetch<{ playlistName: string; totalTracks: number; matchedTracks: SearchResult[] }>('/spotify/import', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
