import '../config/loadEnv.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './db.js';

const JWT_EXPIRES_IN: jwt.SignOptions['expiresIn'] = (process.env.AUTH_TOKEN_TTL || '7d') as jwt.SignOptions['expiresIn'];
const JWT_SECRET = getJwtSecret();

export interface AuthUser {
  id: number;
  username: string;
}

interface JwtPayload {
  sub: string;
  username: string;
}

export async function getUserCount(): Promise<number> {
  const result = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users;');
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

export async function setupFirstUser(username: string, password: string): Promise<AuthUser> {
  const userCount = await getUserCount();
  if (userCount > 0) {
    throw new Error('Initial setup has already been completed.');
  }

  const normalizedUsername = normalizeUsername(username);
  validatePassword(password);

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query<{ id: number; username: string }>(
    `
      INSERT INTO users (username, password_hash)
      VALUES ($1, $2)
      RETURNING id, username;
    `,
    [normalizedUsername, passwordHash],
  );

  return result.rows[0];
}

export async function validateUserCredentials(username: string, password: string): Promise<AuthUser | null> {
  const normalizedUsername = normalizeUsername(username);

  const result = await pool.query<{ id: number; username: string; password_hash: string }>(
    `
      SELECT id, username, password_hash
      FROM users
      WHERE LOWER(username) = LOWER($1)
      LIMIT 1;
    `,
    [normalizedUsername],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    return null;
  }

  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1;', [row.id]);

  return { id: row.id, username: row.username };
}

export function issueAuthToken(user: AuthUser): string {
  const payload: JwtPayload = { sub: String(user.id), username: user.username };
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyAuthToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded !== 'object' || decoded === null) {
      return null;
    }

    const payload = decoded as Partial<JwtPayload>;
    if (typeof payload.sub !== 'string' || typeof payload.username !== 'string') {
      return null;
    }

    const id = parseInt(payload.sub, 10);
    if (!Number.isFinite(id)) {
      return null;
    }
    return { id, username: payload.username };
  } catch {
    return null;
  }
}

export async function updateUsername(userId: number, newUsername: string): Promise<AuthUser> {
  const normalized = normalizeUsername(newUsername);

  const conflict = await pool.query<{ id: number }>(
    'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2 LIMIT 1;',
    [normalized, userId],
  );
  if (conflict.rows.length > 0) {
    throw new Error('That username is already taken.');
  }

  const result = await pool.query<{ id: number; username: string }>(
    'UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username;',
    [normalized, userId],
  );
  return result.rows[0];
}

export async function updatePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
  const result = await pool.query<{ password_hash: string }>(
    'SELECT password_hash FROM users WHERE id = $1;',
    [userId],
  );
  const row = result.rows[0];
  if (!row) throw new Error('User not found.');

  const valid = await bcrypt.compare(currentPassword, row.password_hash);
  if (!valid) throw new Error('Current password is incorrect.');

  validatePassword(newPassword);
  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2;', [newHash, userId]);
}

function normalizeUsername(input: string): string {
  const value = input.trim();
  if (value.length < 3 || value.length > 64) {
    throw new Error('Username must be between 3 and 64 characters.');
  }
  return value;
}

function validatePassword(input: string): void {
  if (input.length < 8 || input.length > 128) {
    throw new Error('Password must be between 8 and 128 characters.');
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required to start the server.');
  }
  return secret;
}
