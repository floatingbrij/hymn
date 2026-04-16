import type { SearchResult } from '../types.js';
import YouTubeSR from 'youtube-sr';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const YouTube = YouTubeSR.default || YouTubeSR;

// ── Search via youtube-sr (direct YouTube scraping, no API key) ──

export async function searchTracks(query: string): Promise<SearchResult[]> {
  try {
    const results = await YouTube.search(query, { limit: 20, type: 'video' });
    return results
      .filter((v) => v.id && v.duration && v.duration > 0)
      .map((v) => ({
        videoId: v.id!,
        title: v.title || 'Unknown',
        artist: v.channel?.name || 'Unknown Artist',
        thumbnail: v.thumbnail?.url || `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
        duration: Math.floor((v.duration || 0) / 1000),
      }));
  } catch (err) {
    console.error('youtube-sr search failed:', err);
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

// ── Stream info via yt-dlp (most reliable YouTube extractor) ──

// Cache stream URLs for 30 minutes (they expire after ~6 hours)
const streamCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000;

export async function getStreamInfo(videoId: string) {
  // Check cache
  const cached = streamCache.get(videoId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const { stdout } = await execAsync(
      `python -m yt_dlp -f "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio" --dump-json --no-download --no-warnings "https://www.youtube.com/watch?v=${videoId}"`,
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

    // Cache the result
    streamCache.set(videoId, { data: result, timestamp: Date.now() });

    return result;
  } catch (err) {
    console.error('yt-dlp stream extraction failed:', err);
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
        `python -m yt_dlp --flat-playlist --dump-json --no-warnings "${source}"`,
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

  // Final fallback: use youtube-sr with safer parsing
  try {
    const results = await YouTube.search('top music hits', { limit: 20, type: 'video' });
    const mapped = results
      .filter((v) => v.id && v.duration && v.duration > 0)
      .map((v) => ({
        videoId: v.id!,
        title: v.title || 'Unknown',
        artist: v.channel?.name || 'Unknown Artist',
        thumbnail: v.thumbnail?.url || `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
        duration: Math.floor((v.duration || 0) / 1000),
      }));
    if (mapped.length > 0) return mapped;
  } catch (err) {
    console.error('youtube-sr trending fallback failed:', err);
  }

  console.error('All trending sources failed');
  return [];
}
