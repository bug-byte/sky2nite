import pool from '../../services/db.js';
import type { SavedObservation } from 'shared/types.js';

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

function rowToObservation(row: ObservationRow): SavedObservation {
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

export async function getObservationsQuery(userId: number): Promise<SavedObservation[]> {
  const result = await pool.query<ObservationRow>(
    `SELECT * FROM saved_observations WHERE user_id = $1 ORDER BY saved_at DESC;`,
    [userId],
  );
  return result.rows.map(rowToObservation);
}
