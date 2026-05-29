import pool from '../../services/db.js';
import type { UserSettings } from './getSettingsQuery.js';

export async function updateSettingsCommand(
  userId: number,
  patch: Partial<UserSettings>,
): Promise<UserSettings> {
  const result = await pool.query<{ particles_enabled: boolean }>(
    `INSERT INTO user_settings (user_id, particles_enabled, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET particles_enabled = EXCLUDED.particles_enabled,
           updated_at        = NOW()
     RETURNING particles_enabled`,
    [userId, patch.particlesEnabled ?? true],
  );

  return { particlesEnabled: result.rows[0].particles_enabled };
}
