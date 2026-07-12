const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const { newDb } = require('pg-mem');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const parsedPort = Number.parseInt(process.env.PORT || '8001', 10);
const port = Number.isNaN(parsedPort) ? 8001 : parsedPort;
const host = process.env.RENDER ? '0.0.0.0' : (process.env.HOST || '127.0.0.1');
const buildVersion = process.env.BUILD_VERSION || 'local-dev';
const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://localhost:3000',
  'https://127.0.0.1:3000',
  'https://localhost:3001',
  'https://127.0.0.1:3001',
  'https://localhost:5173',
  'https://127.0.0.1:5173',
  'https://tictactoe-bundle.vercel.app',
  'https://www.tictactoe-bundle.vercel.app',
  'https://*.up.railway.app',
  'https://*.railway.app',
  'https://*.onrender.com',
  'https://*.render.com',
];
const configuredOrigins = (process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);
const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...configuredOrigins])];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  return /https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(origin)
    || /https:\/\/([a-z0-9-]+\.)*railway\.app$/i.test(origin)
    || /https:\/\/([a-z0-9-]+\.)*netlify\.app$/i.test(origin)
    || /https:\/\/([a-z0-9-]+\.)*onrender\.com$/i.test(origin)
    || /https:\/\/([a-z0-9-]+\.)*render\.com$/i.test(origin)
    || /https?:\/\/localhost(:\d+)?$/i.test(origin)
    || /https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin);
}

let pool;
let databaseMode = 'postgres';

function createPool() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || process.env.SUPABASE_DB_URL;
  const sslEnabled = process.env.DATABASE_SSL === 'true' || Boolean(process.env.NEON_DATABASE_URL) || Boolean(process.env.SUPABASE_DB_URL) || Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase'));

  if (databaseUrl) {
    console.log('Database connection source:', process.env.DATABASE_URL ? 'DATABASE_URL' : (process.env.POSTGRES_URL ? 'POSTGRES_URL' : (process.env.NEON_DATABASE_URL ? 'NEON_DATABASE_URL' : 'SUPABASE_DB_URL')));
    return new Pool({
      connectionString: databaseUrl,
      ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
      statement_timeout: 10000,
    });
  }

  console.error('No PostgreSQL connection string found. Set DATABASE_URL, POSTGRES_URL, NEON_DATABASE_URL, or SUPABASE_DB_URL.');
  throw new Error('Database connection string is required');
}

pool = createPool();

app.use(cors({
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ACCESS_TTL_SECONDS = 60 * 60 * 24;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;

async function waitForDatabase(maxAttempts = 10, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query('SELECT NOW()');
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error('PostgreSQL not reachable. Check your DATABASE_URL / Neon / Supabase connection settings.');
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function initDb() {
  await waitForDatabase();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      avatar TEXT NOT NULL DEFAULT '🙂',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS password_hash TEXT,
      ADD COLUMN IF NOT EXISTS name TEXT,
      ADD COLUMN IF NOT EXISTS avatar TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      player_x_name TEXT NOT NULL,
      player_x_avatar TEXT NOT NULL,
      player_o_name TEXT NOT NULL,
      player_o_avatar TEXT NOT NULL,
      winner TEXT NOT NULL,
      moves INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE matches
      ADD COLUMN IF NOT EXISTS user_id INTEGER,
      ADD COLUMN IF NOT EXISTS player_x_name TEXT,
      ADD COLUMN IF NOT EXISTS player_x_avatar TEXT,
      ADD COLUMN IF NOT EXISTS player_o_name TEXT,
      ADD COLUMN IF NOT EXISTS player_o_avatar TEXT,
      ADD COLUMN IF NOT EXISTS winner TEXT,
      ADD COLUMN IF NOT EXISTS moves INTEGER,
      ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;
  `);
}

function setAuthCookies(res, accessToken, refreshToken) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: ACCESS_TTL_SECONDS * 1000,
    path: '/',
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: REFRESH_TTL_SECONDS * 1000,
    path: '/',
  });
}

function clearAuthCookies(res) {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
}

function createToken(sub, extra = {}) {
  return jwt.sign({ sub, ...extra }, JWT_SECRET, { expiresIn: '24h' });
}

function userPublicRow(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    created_at: user.created_at,
  };
}

async function getCurrentUser(req) {
  const accessToken = req.cookies?.access_token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!accessToken) throw new Error('Not authenticated');

  const payload = jwt.verify(accessToken, JWT_SECRET);
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [payload.sub]);
  if (!rows[0]) throw new Error('User not found');
  return rows[0];
}

app.get('/health', (_, res) => res.json({ ok: true, database: databaseMode, build: buildVersion }));

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, avatar = '🙂' } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ detail: 'Email, password, and name are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, avatar) VALUES ($1, $2, $3, $4) RETURNING *',
      [normalizedEmail, passwordHash, String(name).trim(), avatar]
    );

    const user = result.rows[0];
    const accessToken = createToken(user.id, { type: 'access' });
    const refreshToken = createToken(user.id, { type: 'refresh' });
    setAuthCookies(res, accessToken, refreshToken);

    return res.json(userPublicRow(user));
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ detail: 'Email already registered' });
    }
    console.error('REGISTER_ERROR', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    });
    return res.status(500).json({
      detail: error.message || 'Something went wrong. Please try again later.',
      code: error.code,
      dbDetail: error.detail,
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    const accessToken = createToken(user.id, { type: 'access' });
    const refreshToken = createToken(user.id, { type: 'refresh' });
    setAuthCookies(res, accessToken, refreshToken);

    return res.json(userPublicRow(user));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ detail: 'Something went wrong. Please try again later.' });
  }
});

app.post('/api/auth/logout', (_, res) => {
  clearAuthCookies(res);
  return res.json({ ok: true });
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    return res.json(userPublicRow(user));
  } catch (error) {
    if (error.message === 'Not authenticated' || error.message === 'User not found') {
      return res.status(401).json({ detail: error.message });
    }
    console.error(error);
    return res.status(500).json({ detail: 'Something went wrong. Please try again later.' });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ detail: 'No refresh token' });
    }

    const payload = jwt.verify(refreshToken, JWT_SECRET);
    const accessToken = createToken(payload.sub, { type: 'access' });
    setAuthCookies(res, accessToken, refreshToken);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(401).json({ detail: 'Invalid refresh token' });
  }
});

app.patch('/api/auth/profile', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const { name, avatar } = req.body;
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push(`name = $${values.length + 1}`);
      values.push(String(name).trim());
    }
    if (avatar !== undefined) {
      updates.push(`avatar = $${values.length + 1}`);
      values.push(String(avatar));
    }

    if (updates.length) {
      values.push(user.id);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}`, values);
    }

    const refreshed = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
    return res.json(userPublicRow(refreshed.rows[0]));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ detail: 'Something went wrong. Please try again later.' });
  }
});

app.post('/api/matches', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const { player_x_name, player_x_avatar, player_o_name, player_o_avatar, winner, moves, duration_seconds } = req.body;
    const result = await pool.query(
      'INSERT INTO matches (user_id, player_x_name, player_x_avatar, player_o_name, player_o_avatar, winner, moves, duration_seconds) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [user.id, player_x_name, player_x_avatar, player_o_name, player_o_avatar, winner, moves, duration_seconds]
    );
    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ detail: 'Something went wrong. Please try again later.' });
  }
});

app.get('/api/matches', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const { rows } = await pool.query('SELECT * FROM matches WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [user.id]);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ detail: 'Something went wrong. Please try again later.' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const { rows } = await pool.query('SELECT winner FROM matches WHERE user_id = $1', [user.id]);
    const stats = { x_wins: 0, o_wins: 0, draws: 0, total: rows.length };
    rows.forEach((row) => {
      if (row.winner === 'X') stats.x_wins += 1;
      else if (row.winner === 'O') stats.o_wins += 1;
      else stats.draws += 1;
    });
    return res.json(stats);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ detail: 'Something went wrong. Please try again later.' });
  }
});

async function startServer({ initDbFn = initDb, listenFn = app.listen.bind(app) } = {}) {
  try {
    await initDbFn();
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }

  const server = listenFn(port, host, () => {
    console.log(`Backend running on http://${host}:${port}`);
  });

  server.on('error', (error) => {
    console.error('Failed to start backend server:', error);
    process.exit(1);
  });

  return server;
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start backend server:', error);
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer,
  initDb,
  createPool,
  setAuthCookies,
  clearAuthCookies,
  getCurrentUser,
};
