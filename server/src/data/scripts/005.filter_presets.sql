-- Filter presets: user-defined combinations of filter values
-- that can be applied to the main observations search with a single click.

CREATE TABLE filter_presets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_magnitude DOUBLE PRECISION,
  min_altitude DOUBLE PRECISION,
  min_alerts INTEGER,
  object_types TEXT[] NOT NULL DEFAULT '{}',
  visibility_start TEXT NOT NULL DEFAULT '',
  visibility_end TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT filter_presets_user_name_unique UNIQUE (user_id, name)
);

CREATE INDEX filter_presets_user_id_idx ON filter_presets (user_id);
