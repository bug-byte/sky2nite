import pool from '../../services/db.js';

export async function getGuestModeQuery(): Promise<{ guestModeEnabled: boolean }> {
  const result = await pool.query<{ guest_mode_enabled: boolean }>(
    `SELECT guest_mode_enabled FROM user_settings LIMIT 1`,
  );
  return { guestModeEnabled: result.rows[0]?.guest_mode_enabled ?? false };
}
