// API Response Types
export interface VisibilityWindow {
  start: string; // ISO datetime
  end: string; // ISO datetime
  duration: number; // hours
}

export interface VisibleObject {
  locusId: string;
  ra: number;
  dec: number;
  magnitude: number;
  tags: string[];
  visibilityWindow: VisibilityWindow;
  maxAltitude: number; // degrees
  objectIds: {
    ztf?: string;
    lsst?: string;
  };
  antaresUrl: string;
}

export interface SearchResponse {
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
}

// Request Types
export interface SearchFilters {
  maxMagnitude?: number;
  objectTypes?: string[];
}

export interface SearchRequest {
  latitude: number;
  longitude: number;
  date?: string;
  filters?: SearchFilters;
}

export interface TagsResponse {
  tags: string[];
}
