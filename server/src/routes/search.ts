import { Router, type Router as RouterType } from 'express';
import { searchTracks, searchSuggestions, getTrending } from '../services/piped.js';

export const searchRouter: RouterType = Router();

searchRouter.get('/', async (req, res) => {
  const query = req.query.q as string;
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    res.status(400).json({ error: 'Query parameter "q" is required' });
    return;
  }

  try {
    const results = await searchTracks(query.trim());
    res.json(results);
  } catch (err) {
    console.error('Search error:', err);
    res.status(502).json({ error: 'Failed to fetch search results' });
  }
});

searchRouter.get('/suggestions', async (req, res) => {
  const query = req.query.q as string;
  if (!query || typeof query !== 'string') {
    res.json([]);
    return;
  }

  try {
    const suggestions = await searchSuggestions(query.trim());
    res.json(suggestions);
  } catch {
    res.json([]);
  }
});

searchRouter.get('/trending', async (_req, res) => {
  try {
    const results = await getTrending();
    res.json(results);
  } catch (err) {
    console.error('Trending error:', err);
    res.status(502).json({ error: 'Failed to fetch trending' });
  }
});
