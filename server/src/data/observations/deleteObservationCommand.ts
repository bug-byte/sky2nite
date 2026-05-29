import pool from '../../services/db.js';
import type { DeleteObservationResult } from 'shared/types.js';

export async function deleteObservationCommand(
  userId: number,
  observationId: number,
): Promise<DeleteObservationResult> {
  const result = await pool.query<{ id: number }>(
    `DELETE FROM saved_observations WHERE id = $1 AND user_id = $2 RETURNING id;`,
    [observationId, userId],
  );

  if (result.rows.length === 0) {
    throw new Error('Observation not found.');
  }

  return { success: true };
}
