import { Router, type Router as RouterType } from 'express';
import { searchTracks } from '../services/piped.js';
import type { SearchResult } from '../types.js';

export const spotifyRouter: RouterType = Router();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '3e4b7620ae86466889b2335c97221fc8';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || 'c60d8e30d99744b09e9ed35487c62768';

// Cached access token
let cachedToken: { token: string; expiresAt: number } | null = null;

// Get Spotify access token via Client Credentials flow
async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error(`Spotify token request failed: ${res.status}`);
  const data = await res.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // refresh 60s early
  };

  return cachedToken.token;
}

// Extract playlist ID from various Spotify URL formats
function extractPlaylistId(url: string): string | null {
  const patterns = [
    /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
    /spotify:playlist:([a-zA-Z0-9]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// Fetch all tracks from a Spotify playlist (handles pagination)
async function fetchSpotifyPlaylist(playlistId: string): Promise<{ name: string; tracks: { name: string; artists: string }[] }> {
  const token = await getSpotifyToken();

  // Get playlist name + first batch of tracks
  const res = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}?fields=name,tracks(total,items(track(name,artists(name))),next)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (res.status === 404) throw new Error('Playlist not found');
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);

  const data = await res.json();
  const tracks: { name: string; artists: string }[] = [];

  // Process first page
  for (const item of data.tracks?.items || []) {
    if (!item.track) continue;
    tracks.push({
      name: item.track.name,
      artists: item.track.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
    });
  }

  // Fetch remaining pages (up to 200 tracks total)
  let nextUrl = data.tracks?.next;
  while (nextUrl && tracks.length < 200) {
    const pageRes = await fetch(nextUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!pageRes.ok) break;
    const page = await pageRes.json();
    for (const item of page.items || []) {
      if (!item.track || tracks.length >= 200) break;
      tracks.push({
        name: item.track.name,
        artists: item.track.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
      });
    }
    nextUrl = page.next;
  }

  return { name: data.name, tracks };
}

// POST /api/spotify/import — Import a Spotify playlist
spotifyRouter.post('/import', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Spotify playlist URL is required' });
    return;
  }

  const playlistId = extractPlaylistId(url.trim());
  if (!playlistId) {
    res.status(400).json({ error: 'Invalid Spotify playlist URL. Paste a link like https://open.spotify.com/playlist/...' });
    return;
  }

  try {
    const playlistData = await fetchSpotifyPlaylist(playlistId);

    if (!playlistData.tracks.length) {
      res.status(404).json({ error: 'No tracks found in this playlist' });
      return;
    }

    // Cap at 50 tracks for YouTube matching
    const tracksToProcess = playlistData.tracks.slice(0, 50);

    // Search YouTube for each track in batches of 5
    const batchSize = 5;
    const results: SearchResult[] = [];

    for (let i = 0; i < tracksToProcess.length; i += batchSize) {
      const batch = tracksToProcess.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(async (track) => {
          const query = `${track.name} ${track.artists}`;
          const searchResults = await searchTracks(query);
          return searchResults[0] || null;
        })
      );

      for (const r of batchResults) {
        if (r.status === 'fulfilled' && r.value) {
          results.push(r.value);
        }
      }
    }

    res.json({
      playlistName: playlistData.name,
      totalTracks: playlistData.tracks.length,
      matchedTracks: results,
    });
  } catch (err: any) {
    console.error('Spotify import error:', err);
    res.status(502).json({ error: 'Failed to import playlist. Make sure it exists and is public.' });
  }
});
