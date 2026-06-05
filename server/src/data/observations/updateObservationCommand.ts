import pool from '../../services/db.js';
import type { ObservationStatus, SavedObservation, UpdateObservationRequest } from 'shared/types.js';

type ObservationRow = {
  id: number;
  user_id: number;
  locus_id: string;
  ra: number;
  dec: number;
  magnitude: number;
  num_alerts: number | null;
  transit_time: Date | null;
  tags: string[];
  visibility_start: Date;
  visibility_end: Date;
  visibility_duration: number;
  max_altitude: number;
  ztf_object_id: string | null;
  lsst_dia_object_id: string | null;
  antares_url: string;
  notes: string;
  status: ObservationStatus;
  rating: number | null;
  saved_at: Date;
};

export async function updateObservationCommand(
  userId: number,
  id: number,
  body: UpdateObservationRequest,
): Promise<SavedObservation> {
  const result = await pool.query<ObservationRow>(
    `
      UPDATE saved_observations
      SET
        notes  = COALESCE($3, notes),
        status = COALESCE($4, status),
        rating = $5
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `,
    [
      id,
      userId,
      body.notes ?? null,
      body.status ?? null,
      body.rating !== undefined ? body.rating : null,
    ],
  );

  if (result.rows.length === 0) {
    throw new Error('Observation not found or access denied.');
  }

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    locusId: row.locus_id,
    ra: row.ra,
    dec: row.dec,
    magnitude: row.magnitude,
    numAlerts: row.num_alerts ?? undefined,
    transitTime: row.transit_time?.toISOString() ?? undefined,
    tags: row.tags,
    visibilityWindow: {
      start: row.visibility_start.toISOString(),
      end: row.visibility_end.toISOString(),
      duration: row.visibility_duration,
    },
    maxAltitude: row.max_altitude,
    objectIds: {
      ztf: row.ztf_object_id ?? undefined,
      lsst: row.lsst_dia_object_id ?? undefined,
    },
    antaresUrl: row.antares_url,
    notes: row.notes,
    status: row.status ?? 'planned',
    rating: row.rating ?? null,
    savedAt: row.saved_at.toISOString(),
  };
}
