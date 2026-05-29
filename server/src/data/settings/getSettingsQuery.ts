import pool from '../../services/db.js';

export type UserSettings = {
  particlesEnabled: boolean;
};

export async function getSettingsQuery(userId: number): Promise<UserSettings> {
  const result = await pool.query<{ particles_enabled: boolean }>(
    `SELECT particles_enabled FROM user_settings WHERE user_id = $1`,
    [userId],
  );

  if (result.rows.length === 0) {
    return { particlesEnabled: true };
  }

  return { particlesEnabled: result.rows[0].particles_enabled };
}
