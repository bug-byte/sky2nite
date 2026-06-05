import pool from '../../services/db.js';
import type { DeleteFilterPresetResult } from 'shared/types.js';

export async function deleteFilterPresetCommand(
  userId: number,
  presetId: number,
): Promise<DeleteFilterPresetResult> {
  const result = await pool.query<{ id: number }>(
    `DELETE FROM filter_presets WHERE id = $1 AND user_id = $2 RETURNING id;`,
    [presetId, userId],
  );

  if (result.rows.length === 0) {
    throw new Error('Filter preset not found.');
  }

  return { success: true };
}
