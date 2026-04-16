import { Router, type Router as RouterType } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/schema.js';
import { signToken, authMiddleware, type AuthRequest } from '../middleware/auth.js';

export const authRouter: RouterType = Router();

const FIREBASE_PROJECT_ID = 'hymn-52cd5';
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let cachedCerts: Record<string, string> | null = null;
let certsExpiry = 0;

async function getGoogleCerts(): Promise<Record<string, string>> {
  if (cachedCerts && Date.now() < certsExpiry) return cachedCerts;
  const res = await fetch(GOOGLE_CERTS_URL);
  cachedCerts = await res.json() as Record<string, string>;
  const cacheControl = res.headers.get('cache-control');
  const maxAge = cacheControl?.match(/max-age=(\d+)/)?.[1];
  certsExpiry = Date.now() + (maxAge ? parseInt(maxAge) * 1000 : 3600000);
  return cachedCerts;
}

async function verifyFirebaseToken(idToken: string) {
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || typeof decoded === 'string') throw new Error('Invalid token');

  const certs = await getGoogleCerts();
  const cert = certs[decoded.header.kid as string];
  if (!cert) throw new Error('Unknown key ID');

  return jwt.verify(idToken, cert, {
    algorithms: ['RS256'],
    audience: FIREBASE_PROJECT_ID,
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
  }) as { email: string; name?: string; sub: string };
}

authRouter.post('/register', async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    res.status(400).json({ error: 'Email, username, and password are required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  if (username.length < 2 || username.length > 30) {
    res.status(400).json({ error: 'Username must be 2-30 characters' });
    return;
  }

  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);

    if (existing) {
      res.status(409).json({ error: 'Email or username already taken' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = db.prepare('INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)').run(
      email,
      username,
      passwordHash
    );

    const userId = result.lastInsertRowid as number;
    const token = signToken(userId, username);

    res.status(201).json({ token, user: { id: userId, username, email } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const db = getDb();
    const user = db.prepare('SELECT id, username, email, password_hash FROM users WHERE email = ?').get(email) as any;

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken(user.id, user.username);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

authRouter.post('/google', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400).json({ error: 'ID token is required' });
    return;
  }

  try {
    const payload = await verifyFirebaseToken(idToken);

    if (!payload.email) {
      res.status(401).json({ error: 'Invalid Google token' });
      return;
    }

    const { email, name, sub: googleId } = payload;
    const username = name || email!.split('@')[0];

    const db = getDb();

    // Check if user exists by email
    let user = db.prepare('SELECT id, username, email FROM users WHERE email = ?').get(email) as any;

    if (!user) {
      // Create new user with a random password hash (they'll only use Google sign-in)
      const placeholderHash = await bcrypt.hash(googleId + Date.now(), 4);
      const result = db.prepare(
        'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)'
      ).run(email, username, placeholderHash);

      user = { id: result.lastInsertRowid as number, username, email };
    }

    const token = signToken(user.id, user.username);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

authRouter.get('/me', authMiddleware as any, (req: AuthRequest, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(req.userId!) as any;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
});
