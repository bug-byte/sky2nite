import pool from '../../services/db.js';
import type { SavedObservation, SaveObservationRequest } from 'shared/types.js';

type ObservationRow = {
  id: number;
  user_id: number;
  locus_id: string;
  ra: number;
  dec: number;
  magnitude: number;
  tags: string[];
  visibility_start: Date;
  visibility_end: Date;
  visibility_duration: number;
  max_altitude: number;
  ztf_object_id: string | null;
  lsst_dia_object_id: string | null;
  antares_url: string;
  notes: string;
  saved_at: Date;
};

export async function saveObservationCommand(
  userId: number,
  body: SaveObservationRequest,
): Promise<SavedObservation> {
  const result = await pool.query<ObservationRow>(
    `
      INSERT INTO saved_observations (
        user_id, locus_id, ra, dec, magnitude, tags,
        visibility_start, visibility_end, visibility_duration,
        max_altitude, ztf_object_id, lsst_dia_object_id, antares_url, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (user_id, locus_id) DO UPDATE SET
        ra = EXCLUDED.ra,
        dec = EXCLUDED.dec,
        magnitude = EXCLUDED.magnitude,
        tags = EXCLUDED.tags,
        visibility_start = EXCLUDED.visibility_start,
        visibility_end = EXCLUDED.visibility_end,
        visibility_duration = EXCLUDED.visibility_duration,
        max_altitude = EXCLUDED.max_altitude,
        ztf_object_id = EXCLUDED.ztf_object_id,
        lsst_dia_object_id = EXCLUDED.lsst_dia_object_id,
        antares_url = EXCLUDED.antares_url,
        notes = EXCLUDED.notes,
        saved_at = NOW()
      RETURNING *;
    `,
    [
      userId,
      body.locusId,
      body.ra,
      body.dec,
      body.magnitude,
      body.tags,
      body.visibilityWindow.start,
      body.visibilityWindow.end,
      body.visibilityWindow.duration,
      body.maxAltitude,
      body.objectIds?.ztf ?? null,
      body.objectIds?.lsst ?? null,
      body.antaresUrl,
      body.notes ?? '',
    ],
  );

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    locusId: row.locus_id,
    ra: row.ra,
    dec: row.dec,
    magnitude: row.magnitude,
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
    savedAt: row.saved_at.toISOString(),
  };
}
