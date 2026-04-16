import type { SearchResult } from '../types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ── Search via yt-dlp (reliable, no scraping breakage) ──

export async function searchTracks(query: string): Promise<SearchResult[]> {
  try {
    const { stdout } = await execAsync(
      `yt-dlp "ytsearch20:${query.replace(/"/g, '\\"')}" --flat-playlist --dump-json --no-warnings`,
      { timeout: 15000, maxBuffer: 10 * 1024 * 1024 }
    );

    const lines = stdout.trim().split('\n').filter(Boolean);
    const results: SearchResult[] = [];

    for (const line of lines) {
      try {
        const info = JSON.parse(line);
        if (!info.id || !info.duration || info.duration < 10) continue;
        results.push({
          videoId: info.id,
          title: info.title || 'Unknown',
          artist: info.uploader || info.channel || 'Unknown Artist',
          thumbnail: info.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${info.id}/mqdefault.jpg`,
          duration: Math.floor(info.duration || 0),
        });
      } catch {
        // Skip bad lines
      }
    }

    return results;
  } catch (err) {
    console.error('yt-dlp search failed:', err);
    throw err;
  }
}

export async function searchSuggestions(query: string): Promise<string[]> {
  try {
    // YouTube suggestions via public endpoint (no key needed)
    const url = `https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&q=${encodeURIComponent(query)}&ds=yt`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const text = await res.text();
    // Response is JSONP: window.google.ac.h([...])
    const match = text.match(/\[.*\]/s);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && Array.isArray(parsed[1])) {
        return parsed[1].map((item: any) => (Array.isArray(item) ? item[0] : item)).slice(0, 8);
      }
    }
    return [];
  } catch {
    return [];
  }
}

// ── Stream info via Invidious API (avoids YouTube bot detection on server IPs) ──

const INVIDIOUS_INSTANCES = [
  'https://inv.thepixora.com',
];

// Cache stream URLs for 30 minutes (they expire after ~6 hours)
const streamCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000;

export async function getStreamInfo(videoId: string) {
  // Check cache
  const cached = streamCache.get(videoId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Try Invidious API instances
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${instance}/api/v1/videos/${videoId}`, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const data = await res.json();
      if (!data.adaptiveFormats?.length) continue;

      // Find audio-only streams, sorted by bitrate (highest first)
      const audioStreams = data.adaptiveFormats
        .filter((f: any) => f.type?.startsWith('audio/') && f.url)
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

      if (audioStreams.length === 0) continue;

      const result = {
        title: data.title || '',
        uploader: data.author || '',
        uploaderUrl: data.authorUrl ? `${instance}${data.authorUrl}` : '',
        thumbnail: data.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        duration: data.lengthSeconds || 0,
        audioStreams: audioStreams.map((s: any) => ({
          url: s.url,
          mimeType: s.type?.split(';')[0] || 'audio/webm',
          bitrate: s.bitrate || 128000,
          codec: s.encoding || 'opus',
        })),
        bestAudioUrl: audioStreams[0].url,
      };

      streamCache.set(videoId, { data: result, timestamp: Date.now() });
      return result;
    } catch (err) {
      console.error(`Invidious instance ${instance} failed:`, err);
    }
  }

  // Fallback: try yt-dlp (may work on some server IPs)
  try {
    const { stdout } = await execAsync(
      `yt-dlp -f "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio" --dump-json --no-download --no-warnings "https://www.youtube.com/watch?v=${videoId}"`,
      { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
    );

    const info = JSON.parse(stdout);
    const result = {
      title: info.title || '',
      uploader: info.uploader || info.channel || '',
      uploaderUrl: info.channel_url || '',
      thumbnail: info.thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      duration: info.duration || 0,
      audioStreams: [{
        url: info.url,
        mimeType: info.acodec ? `audio/${info.ext || 'webm'}` : 'audio/webm',
        bitrate: info.abr ? info.abr * 1000 : 128000,
        codec: info.acodec || 'opus',
      }],
      bestAudioUrl: info.url,
    };

    streamCache.set(videoId, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.error('All stream sources failed for', videoId);
    throw new Error('Failed to extract audio stream');
  }
}

export async function getTrending(): Promise<SearchResult[]> {
  // Use yt-dlp to extract videos from YouTube's trending music page / playlists
  // This is more reliable than youtube-sr which crashes on certain result types
  const sources = [
    'ytsearch30:official music video',
    'ytsearch30:new song official audio',
  ];

  for (const source of sources) {
    try {
      const { stdout } = await execAsync(
        `yt-dlp --flat-playlist --dump-json --no-warnings "${source}"`,
        { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
      );

      const lines = stdout.trim().split('\n').filter(Boolean);
      const results: SearchResult[] = [];

      for (const line of lines) {
        try {
          const info = JSON.parse(line);
          // Skip non-music: must have id, duration, and be under 10 minutes
          if (!info.id || !info.duration || info.duration > 600 || info.duration < 30) continue;
          results.push({
            videoId: info.id,
            title: info.title || 'Unknown',
            artist: info.uploader || info.channel || 'Unknown Artist',
            thumbnail: info.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${info.id}/mqdefault.jpg`,
            duration: Math.floor(info.duration || 0),
          });
        } catch {
          // Skip unparseable lines
        }
      }

      if (results.length > 0) return results.slice(0, 20);
    } catch (err) {
      console.error(`Trending source "${source}" failed:`, err);
    }
  }

  console.error('All trending sources failed');
  return [];
}
