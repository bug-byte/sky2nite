import pool from '../../services/db.js';
import { getSettingsQuery } from './getSettingsQuery.js';
import type { UserSettings } from '../../../../shared/src/types.js';

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
  };

  const result = await pool.query<{
    particles_enabled: boolean
    rare_classification_tags: string[]
    rare_classification_color_map: string
  }>(
    `INSERT INTO user_settings (
       user_id,
       particles_enabled,
       rare_classification_tags,
       rare_classification_color_map,
       updated_at
     )
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET particles_enabled = EXCLUDED.particles_enabled,
           rare_classification_tags = EXCLUDED.rare_classification_tags,
           rare_classification_color_map = EXCLUDED.rare_classification_color_map,
           updated_at        = NOW()
     RETURNING particles_enabled, rare_classification_tags, rare_classification_color_map`,
    [
      userId,
      next.particlesEnabled,
      next.rareClassifications.rareClassificationTags,
      next.rareClassifications.rareClassificationColorMap,
    ],
  );

  return {
    particlesEnabled: result.rows[0].particles_enabled,
    rareClassifications: {
      rareClassificationTags: result.rows[0].rare_classification_tags,
      rareClassificationColorMap: result.rows[0].rare_classification_color_map as UserSettings['rareClassifications']['rareClassificationColorMap'],
    },
  };
}
