import pool from '../../services/db.js';
import { issueAuthToken, normalizeUsername, type AuthUser } from '../../util/auth.js';

export interface UpdateUsernameResult {
  user: AuthUser;
  token: string;
}

export interface UpdateUsernameRequest {
  username?: string;
}

export async function updateUsernameCommand(authUser: AuthUser, body: UpdateUsernameRequest): Promise<UpdateUsernameResult> {
  const normalized = normalizeUsername(body?.username ?? '');

  const conflict = await pool.query<{ id: number }>(
    'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2 LIMIT 1;',
    [normalized, authUser.id],
  );
  if (conflict.rows.length > 0) {
    throw new Error('That username is already taken.');
  }

  const result = await pool.query<{ id: number; username: string }>(
    'UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username;',
    [normalized, authUser.id],
  );

  const user = result.rows[0];
  const token = issueAuthToken(user);
  return { user, token };
}
