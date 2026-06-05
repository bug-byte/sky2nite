import pool from '../../services/db.js';
import type { FilterPreset } from 'shared/types.js';

type FilterPresetRow = {
  id: number;
  user_id: number;
  name: string;
  max_magnitude: number | null;
  min_altitude: number | null;
  min_alerts: number | null;
  object_types: string[];
  visibility_start: string;
  visibility_end: string;
  created_at: Date;
  updated_at: Date;
};

function rowToPreset(row: FilterPresetRow): FilterPreset {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    maxMagnitude: row.max_magnitude ?? undefined,
    minAltitude: row.min_altitude ?? undefined,
    minAlerts: row.min_alerts ?? undefined,
    objectTypes: row.object_types,
    visibilityStart: row.visibility_start,
    visibilityEnd: row.visibility_end,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getFilterPresetsQuery(userId: number): Promise<FilterPreset[]> {
  const result = await pool.query<FilterPresetRow>(
    `SELECT id, user_id, name, max_magnitude, min_altitude, min_alerts,
            object_types, visibility_start, visibility_end, created_at, updated_at
       FROM filter_presets
      WHERE user_id = $1
      ORDER BY name ASC;`,
    [userId],
  );
  return result.rows.map(rowToPreset);
}
