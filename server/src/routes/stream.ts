import { Router, type Router as RouterType } from 'express';
import { getStreamInfo } from '../services/piped.js';

export const streamRouter: RouterType = Router();

// Get stream info (audio URL + metadata)
streamRouter.get('/info/:videoId', async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
    res.status(400).json({ error: 'Invalid video ID' });
    return;
  }

  try {
    const info = await getStreamInfo(videoId);
    res.json(info);
  } catch (err) {
    console.error('Stream info error:', err);
    res.status(502).json({ error: 'Failed to get stream info' });
  }
});

// Proxy audio stream to client (avoids CORS)
streamRouter.get('/audio/:videoId', async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
    res.status(400).json({ error: 'Invalid video ID' });
    return;
  }

  try {
    const info = await getStreamInfo(videoId);

    if (!info.bestAudioUrl) {
      res.status(404).json({ error: 'No audio stream found' });
      return;
    }

    const audioUrl = info.bestAudioUrl;

    // Build headers for range request support
    const headers: Record<string, string> = {};
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const audioRes = await fetch(audioUrl, { headers });

    // Forward status and relevant headers
    res.status(audioRes.status);

    const contentType = audioRes.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    const contentLength = audioRes.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    const contentRange = audioRes.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    const acceptRanges = audioRes.headers.get('accept-ranges');
    if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);

    if (!audioRes.body) {
      res.status(502).json({ error: 'Empty audio response' });
      return;
    }

    // Pipe the stream
    const reader = audioRes.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          break;
        }
        if (!res.write(value)) {
          await new Promise<void>((resolve) => res.once('drain', resolve));
        }
      }
    };

    req.on('close', () => {
      reader.cancel().catch(() => {});
    });

    await pump();
  } catch (err) {
    console.error('Stream proxy error:', err);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to proxy audio stream' });
    }
  }
});
