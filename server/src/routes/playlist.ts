import { Router, type Router as RouterType } from 'express';
import { getDb } from '../db/schema.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

export const playlistRouter: RouterType = Router();

// All playlist routes require auth
playlistRouter.use(authMiddleware as any);

// Get all playlists for user
playlistRouter.get('/', (req: AuthRequest, res) => {
  const db = getDb();
  const playlists = db.prepare(`
    SELECT p.*, COUNT(pt.id) as track_count 
    FROM playlists p 
    LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id 
    WHERE p.user_id = ? 
    GROUP BY p.id 
    ORDER BY p.created_at DESC
  `).all(req.userId!);

  res.json(playlists);
});

// Create playlist
playlistRouter.post('/', (req: AuthRequest, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const db = getDb();
  const result = db.prepare('INSERT INTO playlists (user_id, name) VALUES (?, ?)').run(req.userId!, name.trim());

  res.status(201).json({ id: result.lastInsertRowid, name: name.trim(), track_count: 0 });
});

// Get playlist tracks
playlistRouter.get('/:id/tracks', (req: AuthRequest, res) => {
  const db = getDb();
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!);

  if (!playlist) {
    res.status(404).json({ error: 'Playlist not found' });
    return;
  }

  const tracks = db.prepare('SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position').all(req.params.id);
  res.json(tracks);
});

// Add track to playlist
playlistRouter.post('/:id/tracks', (req: AuthRequest, res) => {
  const { videoId, title, artist, thumbnail, duration } = req.body;
  if (!videoId || !title) {
    res.status(400).json({ error: 'videoId and title are required' });
    return;
  }

  const db = getDb();
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!);

  if (!playlist) {
    res.status(404).json({ error: 'Playlist not found' });
    return;
  }

  const maxPos = db.prepare('SELECT MAX(position) as max FROM playlist_tracks WHERE playlist_id = ?').get(req.params.id) as any;
  const position = (maxPos?.max || 0) + 1;

  db.prepare(
    'INSERT INTO playlist_tracks (playlist_id, video_id, title, artist, thumbnail, duration, position) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(req.params.id, videoId, title, artist || 'Unknown', thumbnail || '', duration || 0, position);

  res.status(201).json({ success: true });
});

// Remove track from playlist
playlistRouter.delete('/:id/tracks/:trackId', (req: AuthRequest, res) => {
  const db = getDb();
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!);

  if (!playlist) {
    res.status(404).json({ error: 'Playlist not found' });
    return;
  }

  db.prepare('DELETE FROM playlist_tracks WHERE id = ? AND playlist_id = ?').run(req.params.trackId, req.params.id);
  res.json({ success: true });
});

// Delete playlist
playlistRouter.delete('/:id', (req: AuthRequest, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM playlists WHERE id = ? AND user_id = ?').run(req.params.id, req.userId!);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Playlist not found' });
    return;
  }

  res.json({ success: true });
});

// ── Liked Tracks ──

playlistRouter.get('/liked/tracks', (req: AuthRequest, res) => {
  const db = getDb();
  const tracks = db.prepare('SELECT * FROM liked_tracks WHERE user_id = ? ORDER BY created_at DESC').all(req.userId!);
  res.json(tracks);
});

playlistRouter.post('/liked/tracks', (req: AuthRequest, res) => {
  const { videoId, title, artist, thumbnail, duration } = req.body;
  if (!videoId || !title) {
    res.status(400).json({ error: 'videoId and title are required' });
    return;
  }

  const db = getDb();
  try {
    db.prepare(
      'INSERT OR IGNORE INTO liked_tracks (user_id, video_id, title, artist, thumbnail, duration) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.userId!, videoId, title, artist || 'Unknown', thumbnail || '', duration || 0);
    res.status(201).json({ liked: true });
  } catch {
    res.status(500).json({ error: 'Failed to like track' });
  }
});

playlistRouter.delete('/liked/tracks/:videoId', (req: AuthRequest, res) => {
  const db = getDb();
  db.prepare('DELETE FROM liked_tracks WHERE user_id = ? AND video_id = ?').run(req.userId!, req.params.videoId);
  res.json({ liked: false });
});
