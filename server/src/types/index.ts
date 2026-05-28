// ANTARES API Types — JSON:API format
export interface AntaresLocus {
  locus_id: string;
  ra: number;
  dec: number;
  properties: {
    ztf_object_id?: string;
    lsst_dia_object_id?: string;
    num_mag_values?: number;
    num_alerts?: number;
    brightest_alert_magnitude?: number;
    newest_alert_magnitude?: number;
    newest_alert_observation_time?: number;
    [key: string]: any;
  };
  tags: string[];
  catalogs?: string[];
  catalog_objects?: Record<string, any[]>;
  watch_list_ids?: string[];
  grav_wave_events?: string[];
}

export interface AntaresLocusListingAttributes {
  ra: number;
  dec: number;
  tags: string[];
  catalogs: string[];
  htm16: number;
  properties: {
    ztf_object_id?: string;
    newest_alert_magnitude?: number;
    newest_alert_observation_time?: number;
    brightest_alert_magnitude?: number;
    brightest_alert_observation_time?: number;
    num_alerts?: number;
    num_mag_values?: number;
    [key: string]: any;
  };
}

export interface AntaresLocusListing {
  type: string;
  id: string;
  attributes: AntaresLocusListingAttributes;
  relationships: Record<string, any>;
  meta: Record<string, any>;
}

export interface AntaresListResponse {
  data: AntaresLocusListing[];
  links: {
    self: string;
    next?: string;
  };
  meta: {
    count: number;
  };
}

// Application Types
export interface LocationInput {
  latitude: number;
  longitude: number;
  date?: string; // ISO date string
}

export interface SearchFilters {
  maxMagnitude?: number;
  objectTypes?: string[];
  minAltitude?: number;
}

export interface SearchPagination {
  cursor?: number;   // ANTARES offset to start from (default 0)
  pageSize?: number;
}

export interface SearchRequest extends LocationInput {
  filters?: SearchFilters;
  pagination?: SearchPagination;
}

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

export interface SearchResponsePagination {
  pageSize: number;
  hasNextPage: boolean;
  nextCursor: number | null;  // ANTARES offset for the next page request (null = end of results)
  antaresTotalLoci: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface AuthUser {
  id: number;
  username: string;
}
