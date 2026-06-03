ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS rare_classification_tags TEXT[] NOT NULL DEFAULT ARRAY[
    'nuclear transient',
    'RCB star',
    'blue transient',
    'dwarf nova outburst',
    'young extragalactic candidate'
  ],
  ADD COLUMN IF NOT EXISTS rare_classification_color_map TEXT NOT NULL DEFAULT 'aurora';

UPDATE user_settings
SET
  rare_classification_tags = COALESCE(
    rare_classification_tags,
    ARRAY[
      'nuclear transient',
      'RCB star',
      'blue transient',
      'dwarf nova outburst',
      'young extragalactic candidate'
    ]
  ),
  rare_classification_color_map = COALESCE(rare_classification_color_map, 'aurora');