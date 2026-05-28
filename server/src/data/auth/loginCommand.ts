import bcrypt from 'bcryptjs';
import pool from '../../services/db.js';
import { issueAuthToken, type AuthUser } from '../../util/auth.js';

export interface LoginResult {
  user: AuthUser;
  token: string;
}

export interface LoginRequest {
  username?: string;
  password?: string;
}

export async function loginCommand(body: LoginRequest): Promise<LoginResult> {
  const username = (body?.username ?? '').trim();
  const password = body?.password ?? '';

  const result = await pool.query<{ id: number; username: string; password_hash: string }>(
    `
      SELECT id, username, password_hash
      FROM users
      WHERE LOWER(username) = LOWER($1)
      LIMIT 1;
    `,
    [username],
  );

  const row = result.rows[0];
  const valid = row ? await bcrypt.compare(password, row.password_hash) : false;
  if (!row || !valid) {
    throw new Error('Invalid username or password.');
  }

  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1;', [row.id]);

  const user: AuthUser = { id: row.id, username: row.username };
  const token = issueAuthToken(user);
  return { user, token };
}
