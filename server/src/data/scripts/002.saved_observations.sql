CREATE TABLE IF NOT EXISTS saved_observations (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  locus_id        TEXT NOT NULL,
  ra              DOUBLE PRECISION NOT NULL,
  dec             DOUBLE PRECISION NOT NULL,
  magnitude       DOUBLE PRECISION NOT NULL,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  visibility_start TIMESTAMPTZ NOT NULL,
  visibility_end   TIMESTAMPTZ NOT NULL,
  visibility_duration DOUBLE PRECISION NOT NULL,
  max_altitude    DOUBLE PRECISION NOT NULL,
  ztf_object_id   TEXT,
  lsst_dia_object_id TEXT,
  antares_url     TEXT NOT NULL,
  notes           TEXT NOT NULL DEFAULT '',
  saved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS saved_observations_user_locus_uidx
  ON saved_observations (user_id, locus_id);
