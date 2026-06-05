// Types shared between the sky2nite client and server

export type RareClassificationColorMapId = 'aurora' | 'ember' | 'nebula' | 'sunset'

export type RareClassificationSettings = {
  rareClassificationTags: string[]
  rareClassificationColorMap: RareClassificationColorMapId
}

export type UserSettings = {
  particlesEnabled: boolean
  rareClassifications: RareClassificationSettings
}

export type AuthUser = {
  id: number;
  username: string;
}

export type LocationInput = {
  latitude: number;
  longitude: number;
  date?: string; // ISO date string
}

export type SearchFilters = {
  maxMagnitude?: number;
  objectTypes?: string[];
  minAltitude?: number;
  minAlerts?: number;
}

export type SearchPagination = {
  cursor?: number;   // ANTARES offset to start from (default 0)
  pageSize?: number;
}

export type SearchRequest = LocationInput & {
  filters?: SearchFilters;
  pagination?: SearchPagination;
  includeAlertActivity?: boolean;
}

export type VisibilityWindow = {
  start: string;  // ISO datetime
  end: string;    // ISO datetime
  duration: number; // hours
}

export type VisibleObject = {
  locusId: string;
  ra: number;
  dec: number;
  magnitude: number;
  numAlerts?: number;
  alertActivityCurve?: number[];
  tags: string[];
  visibilityWindow: VisibilityWindow;
  maxAltitude: number; // degrees
  objectIds: {
    ztf?: string;
    lsst?: string;
  };
  antaresUrl: string;
}

export type SearchResponsePagination = {
  pageSize: number;
  hasNextPage: boolean;
  nextCursor: number | null;  // ANTARES offset for next page (null = end of results)
  antaresTotalLoci: number;
}

export type SearchResponse = {
  location: {
    latitude: number;
    longitude: number;
  };
  date: string;
  nightWindow: {
    sunset: string;
    sunrise: string;
  };
  objects: VisibleObject[];
  count: number;
  pagination: SearchResponsePagination;
}

// Auth types
export type SetupStatus = {
  isSetupComplete: boolean;
}

export type AuthResponse = {
  user: AuthUser;
  token: string;
}

export type GetMeResult = {
  user: AuthUser;
}

export type LoginRequest = {
  username?: string;
  password?: string;
}

export type SetupFirstUserRequest = {
  username?: string;
  password?: string;
}

export type UpdateUsernameRequest = {
  username?: string;
}

export type UpdatePasswordRequest = {
  currentPassword?: string;
  newPassword?: string;
}

export type UpdatePasswordResult = {
  success: true;
}

// Saved observations
export type SavedObservation = {
  id: number;
  userId: number;
  locusId: string;
  ra: number;
  dec: number;
  magnitude: number;
  numAlerts?: number;
  tags: string[];
  visibilityWindow: VisibilityWindow;
  maxAltitude: number;
  objectIds: {
    ztf?: string;
    lsst?: string;
  };
  antaresUrl: string;
  notes: string;
  savedAt: string; // ISO datetime
}

export type SaveObservationRequest = {
  locusId: string;
  ra: number;
  dec: number;
  magnitude: number;
  tags: string[];
  visibilityWindow: VisibilityWindow;
  maxAltitude: number;
  objectIds: {
    ztf?: string;
    lsst?: string;
  };
  antaresUrl: string;
  notes?: string;
}

export type DeleteObservationResult = {
  success: true;
}

// Filter presets
export type FilterPreset = {
  id: number;
  userId: number;
  name: string;
  maxMagnitude?: number;
  minAltitude?: number;
  minAlerts?: number;
  objectTypes: string[];
  visibilityStart: string;  // HH:MM
  visibilityEnd: string;    // HH:MM
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export type CreateFilterPresetRequest = {
  name: string;
  maxMagnitude?: number;
  minAltitude?: number;
  minAlerts?: number;
  objectTypes?: string[];
  visibilityStart?: string;
  visibilityEnd?: string;
}

export type UpdateFilterPresetRequest = {
  name?: string;
  maxMagnitude?: number;
  minAltitude?: number;
  minAlerts?: number;
  objectTypes?: string[];
  visibilityStart?: string;
  visibilityEnd?: string;
}

export type DeleteFilterPresetResult = {
  success: true;
}
