import pool from '../../services/db.js';
import type { ObservationStatus, SavedObservation, SaveObservationRequest } from 'shared/types.js';

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

export async function saveObservationCommand(
  userId: number,
  body: SaveObservationRequest,
): Promise<SavedObservation> {
  const result = await pool.query<ObservationRow>(
    `
      INSERT INTO saved_observations (
        user_id, locus_id, ra, dec, magnitude, num_alerts, transit_time, tags,
        visibility_start, visibility_end, visibility_duration,
        max_altitude, ztf_object_id, lsst_dia_object_id, antares_url, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (user_id, locus_id) DO UPDATE SET
        ra = EXCLUDED.ra,
        dec = EXCLUDED.dec,
        magnitude = EXCLUDED.magnitude,
        num_alerts = EXCLUDED.num_alerts,
        transit_time = EXCLUDED.transit_time,
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
      body.numAlerts ?? null,
      body.transitTime ?? null,
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
