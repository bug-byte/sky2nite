import bcrypt from 'bcryptjs';
import pool from '../../services/db.js';
import { validatePassword, type AuthUser } from '../../util/auth.js';

export interface UpdatePasswordResult {
  success: true;
}

export interface UpdatePasswordRequest {
  currentPassword?: string;
  newPassword?: string;
}

export async function updatePasswordCommand(authUser: AuthUser, body: UpdatePasswordRequest): Promise<UpdatePasswordResult> {
  const currentPassword = body?.currentPassword ?? '';
  const newPassword = body?.newPassword ?? '';

  const result = await pool.query<{ password_hash: string }>(
    'SELECT password_hash FROM users WHERE id = $1;',
    [authUser.id],
  );
  const row = result.rows[0];
  if (!row) throw new Error('User not found.');

  const valid = await bcrypt.compare(currentPassword, row.password_hash);
  if (!valid) throw new Error('Current password is incorrect.');

  validatePassword(newPassword);
  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2;', [newHash, authUser.id]);

  return { success: true };
}
