import pool from '../../services/db.js';
import { DEFAULT_USER_SETTINGS } from 'shared/userSettings.js';
import {
  type UserSettings,
} from 'shared/types.js';

export async function getSettingsQuery(userId: number): Promise<UserSettings> {
  const result = await pool.query<{
    particles_enabled: boolean
    rare_classification_tags: string[]
    rare_classification_color_map: string
  }>(
    `SELECT particles_enabled, rare_classification_tags, rare_classification_color_map
     FROM user_settings WHERE user_id = $1`,
    [userId],
  );

  if (result.rows.length === 0) {
    return DEFAULT_USER_SETTINGS;
  }

  return {
    particlesEnabled: result.rows[0].particles_enabled,
    rareClassifications: {
      rareClassificationTags: result.rows[0].rare_classification_tags ?? DEFAULT_USER_SETTINGS.rareClassifications.rareClassificationTags,
      rareClassificationColorMap: (result.rows[0].rare_classification_color_map as UserSettings['rareClassifications']['rareClassificationColorMap']) ?? DEFAULT_USER_SETTINGS.rareClassifications.rareClassificationColorMap,
    },
  };
}
