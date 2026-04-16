import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchRouter } from './routes/search.js';
import { streamRouter } from './routes/stream.js';
import { authRouter } from './routes/auth.js';
import { playlistRouter } from './routes/playlist.js';
import { initJamHandler } from './socket/jamHandler.js';
import { initDb } from './db/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api/search', searchRouter);
app.use('/api/stream', streamRouter);
app.use('/api/auth', authRouter);
app.use('/api/playlists', playlistRouter);

// Serve static files in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Initialize database
initDb();

// Initialize Socket.IO jam handler
initJamHandler(io);

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(Number(PORT), HOST, () => {
  console.log(`🎵 Hymn server running on ${HOST}:${PORT}`);
});
