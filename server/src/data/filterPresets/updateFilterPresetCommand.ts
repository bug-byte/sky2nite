import pool from '../../services/db.js';
import type { FilterPreset, UpdateFilterPresetRequest } from 'shared/types.js';

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

export async function updateFilterPresetCommand(
  userId: number,
  presetId: number,
  patch: UpdateFilterPresetRequest,
): Promise<FilterPreset> {
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) {
      throw new Error('Preset name is required.');
    }
    if (trimmed.length > 80) {
      throw new Error('Preset name must be 80 characters or fewer.');
    }
  }

  const result = await pool.query<FilterPresetRow>(
    `UPDATE filter_presets
        SET name             = COALESCE($3, name),
            max_magnitude    = $4,
            min_altitude     = $5,
            min_alerts       = $6,
            object_types     = COALESCE($7, object_types),
            visibility_start = COALESCE($8, visibility_start),
            visibility_end   = COALESCE($9, visibility_end),
            updated_at       = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id, user_id, name, max_magnitude, min_altitude, min_alerts,
                object_types, visibility_start, visibility_end, created_at, updated_at;`,
    [
      presetId,
      userId,
      patch.name?.trim() ?? null,
      // For numeric and array fields, distinguish "omitted" (don't touch) from "explicit null/empty"
      // using a sentinel: an object is treated as present in the API request, so we pass it
      // through. `undefined` means "don't change", and the route handler strips those.
      patch.maxMagnitude ?? null,
      patch.minAltitude ?? null,
      patch.minAlerts ?? null,
      patch.objectTypes ?? null,
      patch.visibilityStart ?? null,
      patch.visibilityEnd ?? null,
    ],
  );

  if (result.rows.length === 0) {
    throw new Error('Filter preset not found.');
  }

  return rowToPreset(result.rows[0]);
}
