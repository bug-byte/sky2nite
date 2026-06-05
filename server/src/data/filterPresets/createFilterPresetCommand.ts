import pool from '../../services/db.js';
import type { CreateFilterPresetRequest, FilterPreset } from 'shared/types.js';

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

export async function createFilterPresetCommand(
  userId: number,
  body: CreateFilterPresetRequest,
): Promise<FilterPreset> {
  const name = body.name?.trim();
  if (!name) {
    throw new Error('Preset name is required.');
  }
  if (name.length > 80) {
    throw new Error('Preset name must be 80 characters or fewer.');
  }

  const result = await pool.query<FilterPresetRow>(
    `INSERT INTO filter_presets (
        user_id, name, max_magnitude, min_altitude, min_alerts,
        object_types, visibility_start, visibility_end
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, name) DO UPDATE SET
        max_magnitude = EXCLUDED.max_magnitude,
        min_altitude  = EXCLUDED.min_altitude,
        min_alerts    = EXCLUDED.min_alerts,
        object_types  = EXCLUDED.object_types,
        visibility_start = EXCLUDED.visibility_start,
        visibility_end   = EXCLUDED.visibility_end,
        updated_at    = NOW()
      RETURNING id, user_id, name, max_magnitude, min_altitude, min_alerts,
                object_types, visibility_start, visibility_end, created_at, updated_at;`,
    [
      userId,
      name,
      body.maxMagnitude ?? null,
      body.minAltitude ?? null,
      body.minAlerts ?? null,
      body.objectTypes ?? [],
      body.visibilityStart ?? '',
      body.visibilityEnd ?? '',
    ],
  );

  return rowToPreset(result.rows[0]);
}
