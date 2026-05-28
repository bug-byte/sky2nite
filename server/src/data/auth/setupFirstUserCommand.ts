import bcrypt from 'bcryptjs';
import pool from '../../services/db.js';
import { issueAuthToken, normalizeUsername, validatePassword, type AuthUser } from '../../util/auth.js';

export interface SetupFirstUserResult {
  user: AuthUser;
  token: string;
}

export interface SetupFirstUserRequest {
  username?: string;
  password?: string;
}

export async function setupFirstUserCommand(body: SetupFirstUserRequest): Promise<SetupFirstUserResult> {
  const username = normalizeUsername(body?.username ?? '');
  validatePassword(body?.password ?? '');

  const countResult = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users;');
  const count = parseInt(countResult.rows[0]?.count ?? '0', 10);
  if (count > 0) {
    throw new Error('Initial setup has already been completed.');
  }

  const passwordHash = await bcrypt.hash(body.password!, 12);
  const result = await pool.query<{ id: number; username: string }>(
    `
      INSERT INTO users (username, password_hash)
      VALUES ($1, $2)
      RETURNING id, username;
    `,
    [username, passwordHash],
  );

  const user = result.rows[0];
  const token = issueAuthToken(user);
  return { user, token };
}
