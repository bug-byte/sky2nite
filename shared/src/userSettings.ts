import type { RareClassificationColorMapId, RareClassificationSettings, UserSettings } from './types.js'

export const DEFAULT_RARE_CLASSIFICATION_TAGS = [
  'nuclear transient',
  'RCB star',
  'blue transient',
  'dwarf nova outburst',
  'young extragalactic candidate',
]

export const DEFAULT_RARE_CLASSIFICATION_COLOR_MAP: RareClassificationColorMapId = 'aurora'

export const DEFAULT_RARE_CLASSIFICATION_SETTINGS: RareClassificationSettings = {
  rareClassificationTags: DEFAULT_RARE_CLASSIFICATION_TAGS,
  rareClassificationColorMap: DEFAULT_RARE_CLASSIFICATION_COLOR_MAP,
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  particlesEnabled: true,
  rareClassifications: DEFAULT_RARE_CLASSIFICATION_SETTINGS,
}