import '../config/loadEnv.js';
import jwt from 'jsonwebtoken';
import type { AuthUser } from 'shared/types.js';

const JWT_EXPIRES_IN: jwt.SignOptions['expiresIn'] = (process.env.AUTH_TOKEN_TTL || '7d') as jwt.SignOptions['expiresIn'];
const JWT_SECRET = getJwtSecret();

type JwtPayload = {
  sub: string;
  username: string;
}

export type { AuthUser };

export function issueAuthToken(user: AuthUser): string {
  const payload: JwtPayload = { sub: String(user.id), username: user.username };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAuthToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded !== 'object' || decoded === null) return null;

    const payload = decoded as Partial<JwtPayload>;
    if (typeof payload.sub !== 'string' || typeof payload.username !== 'string') return null;

    const id = parseInt(payload.sub, 10);
    if (!Number.isFinite(id)) return null;

    return { id, username: payload.username };
  } catch {
    return null;
  }
}

export function normalizeUsername(input: string): string {
  const value = input.trim();
  if (value.length < 3 || value.length > 64) {
    throw new Error('Username must be between 3 and 64 characters.');
  }
  return value;
}

export function validatePassword(input: string): void {
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
