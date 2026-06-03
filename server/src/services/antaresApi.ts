// ANTARES API Types — JSON:API format
type AntaresLocusListingAttributes = {
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

type AntaresAlert = {
  type: string;
  id: string;
  attributes: {
    properties: {
      ant_mjd?: number;
      ztf_jd?: number;
      [key: string]: any;
    };
    [key: string]: any;
  };
  mjd?: number;
  meta: Record<string, any>;
  relationships: Record<string, any>;
}

type AntaresLocusListing = {
  type: string;
  id: string;
  attributes: AntaresLocusListingAttributes;
  relationships: Record<string, any>;
  meta: Record<string, any>;
}

type AntaresListResponse = {
  data: AntaresLocusListing[];
  links: {
    self: string;
    next?: string;
  };
  meta: {
    count: number;
  };
}

type AntaresAlertsResponse = {
  data: AntaresAlert[];
  links: {
    self: string;
    next?: string;
  };
  meta: {
    count: number;
  };
}

type AntaresLocus = {
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

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
}

type LociAtOffsetResult = {
  loci: AntaresLocus[];
  antaresTotalLoci: number;
  hasNextPage: boolean;
}

export class AntaresApiClient {
  private baseURL: string;
  private timeout: number;
  private cache: Map<string, CacheEntry<any>>;
  private cacheTTL: number;

  constructor(baseURL: string, cacheTTL: number = 3600) {
    this.baseURL = baseURL.replace(/\/$/, '');
    this.timeout = 30000;
    this.cache = new Map();
    this.cacheTTL = cacheTTL * 1000;
  }

  private async get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    const url = new URL(`${this.baseURL}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`ANTARES API responded with ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getCacheKey(method: string, ...args: any[]): string {
    return `${method}:${JSON.stringify(args)}`;
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.cacheTTL,
    });
  }

  // Convert a locus listing from JSON:API format into internal AntaresLocus type
  private listingToLocus(listing: AntaresLocusListing): AntaresLocus {
    const attrs = listing.attributes;
    return {
      locus_id: listing.id,
      ra: attrs.ra,
      dec: attrs.dec,
      tags: attrs.tags || [],
      catalogs: attrs.catalogs || [],
      properties: attrs.properties || {},
    };
  }

  private extractAlertMjd(alert: AntaresAlert): number | null {
    if (typeof alert.mjd === 'number') {
      return alert.mjd;
    }

    const props = alert.attributes?.properties;
    if (!props) {
      return null;
    }

    if (typeof props.ant_mjd === 'number') {
      return props.ant_mjd;
    }

    if (typeof props.ztf_jd === 'number') {
      return props.ztf_jd - 2400000.5;
    }

    return null;
  }

  private buildAlertActivityCurve(alerts: AntaresAlert[], binCount: number = 8): number[] {
    const mjds = alerts
      .map((alert) => this.extractAlertMjd(alert))
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b);

    if (mjds.length === 0) {
      return [];
    }

    if (mjds.length === 1) {
      return [1];
    }

    const bins = Array.from({ length: Math.min(binCount, mjds.length) }, () => 0);
    const first = mjds[0];
    const last = mjds[mjds.length - 1];
    const span = last - first;

    if (span <= 0) {
      bins[bins.length - 1] = mjds.length;
      return bins;
    }

    for (const mjd of mjds) {
      const normalized = (mjd - first) / span;
      const index = Math.min(bins.length - 1, Math.floor(normalized * bins.length));
      bins[index] += 1;
    }

    return bins;
  }

  async fetchAlertActivityCurve(locusId: string, sampleLimit: number = 24): Promise<number[]> {
    const safeLimit = Math.max(1, Math.min(50, Math.floor(sampleLimit)));
    const cacheKey = this.getCacheKey('alertActivityCurve', locusId, safeLimit);
    const cached = this.getCached<number[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const data = await this.get<AntaresAlertsResponse>(`/loci/${locusId}/alerts`, {
      'page[limit]': safeLimit,
      'sort': '-mjd',
    });

    const curve = this.buildAlertActivityCurve(data.data);
    this.setCache(cacheKey, curve);
    return curve;
  }

  // List loci with optional filters (JSON:API REST format) — internal helper
  private async listLoci(params: Record<string, string | number>): Promise<LociAtOffsetResult> {
    const cacheKey = this.getCacheKey('list', params);
    const cached = this.getCached<LociAtOffsetResult>(cacheKey);
    if (cached) {
      console.log('Returning cached ANTARES loci batch', params);
      return cached;
    }

    try {
      const data = await this.get<AntaresListResponse>('/loci', params);
      const loci = data.data.map(l => this.listingToLocus(l));

      const result: LociAtOffsetResult = {
        loci,
        antaresTotalLoci: data.meta.count,
        hasNextPage: Boolean(data.links.next),
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('ANTARES list error:', error);
      throw new Error(`Failed to search ANTARES: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Fetch one batch of raw (unfiltered) loci from a specific ANTARES offset.
  // Magnitude and visibility filtering is left to the caller so cursor arithmetic
  // maps 1-to-1 with ANTARES item indices.
  async fetchLociAtOffset(
    offset: number,
    limit: number = 500,
  ): Promise<LociAtOffsetResult> {
    const safeOffset = Math.max(0, Math.floor(offset));
    const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));

    const params: Record<string, string | number> = {
      'sort': 'properties.brightest_alert_magnitude',
      'page[limit]': safeLimit,
      'page[offset]': safeOffset,
    };

    return this.listLoci(params);
  }

  // Get available tags for filtering
  async getAvailableTags(): Promise<string[]> {
    const cacheKey = this.getCacheKey('getTags');
    const cached = this.getCached<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const data = await this.get<{ data: Array<{ id: string }> }>('/tags', { 'page[limit]': 100 });
      const tags = data.data.map(t => t.id);
      this.setCache(cacheKey, tags, 86400000); // Cache for 24 hours
      return tags;
    } catch (error) {
      console.error('Failed to get tags:', error);
      return [
        'extragalactic',
        'nuclear_transient',
        'blue_transient',
        'dwarf_nova_outburst',
        'young_extragalactic_candidate',
      ];
    }
  }

  // Clear the cache
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
const baseURL = process.env.ANTARES_API_BASE_URL || 'https://api.antares.noirlab.edu/v1';
const cacheTTL = parseInt(process.env.CACHE_TTL_SECONDS || '3600', 10);
export const antaresApi = new AntaresApiClient(baseURL, cacheTTL);


