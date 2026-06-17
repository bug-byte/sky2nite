import pool from '../../services/db.js';
import { getSettingsQuery } from './getSettingsQuery.js';
import type { UserSettings } from 'shared/types.js';

export async function updateSettingsCommand(
  userId: number,
  patch: Partial<UserSettings>,
): Promise<UserSettings> {
  const current = await getSettingsQuery(userId);
  const next: UserSettings = {
    particlesEnabled: patch.particlesEnabled ?? current.particlesEnabled,
    rareClassifications: {
      rareClassificationTags: patch.rareClassifications?.rareClassificationTags ?? current.rareClassifications.rareClassificationTags,
      rareClassificationColorMap: patch.rareClassifications?.rareClassificationColorMap ?? current.rareClassifications.rareClassificationColorMap,
    },
    guestModeEnabled: patch.guestModeEnabled ?? current.guestModeEnabled,
  };

  const result = await pool.query<{
    particles_enabled: boolean
    rare_classification_tags: string[]
    rare_classification_color_map: string
    guest_mode_enabled: boolean
  }>(
    `INSERT INTO user_settings (
       user_id,
       particles_enabled,
       rare_classification_tags,
       rare_classification_color_map,
       guest_mode_enabled,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET particles_enabled = EXCLUDED.particles_enabled,
           rare_classification_tags = EXCLUDED.rare_classification_tags,
           rare_classification_color_map = EXCLUDED.rare_classification_color_map,
           guest_mode_enabled = EXCLUDED.guest_mode_enabled,
           updated_at        = NOW()
     RETURNING particles_enabled, rare_classification_tags, rare_classification_color_map, guest_mode_enabled`,
    [
      userId,
      next.particlesEnabled,
      next.rareClassifications.rareClassificationTags,
      next.rareClassifications.rareClassificationColorMap,
      next.guestModeEnabled,
    ],
  );

  return {
    particlesEnabled: result.rows[0].particles_enabled,
    rareClassifications: {
      rareClassificationTags: result.rows[0].rare_classification_tags,
      rareClassificationColorMap: result.rows[0].rare_classification_color_map as UserSettings['rareClassifications']['rareClassificationColorMap'],
    },
    guestModeEnabled: result.rows[0].guest_mode_enabled,
  };
}
