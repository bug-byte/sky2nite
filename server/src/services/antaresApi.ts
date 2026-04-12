import axios, { AxiosInstance } from 'axios';
import type { AntaresLocus, AntaresListResponse, AntaresLocusListing, CacheEntry } from '../types/index.js';

export class AntaresApiClient {
  private client: AxiosInstance;
  private cache: Map<string, CacheEntry<any>>;
  private cacheTTL: number;

  constructor(baseURL: string, cacheTTL: number = 3600) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
      },
    });
    this.cache = new Map();
    this.cacheTTL = cacheTTL * 1000;
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

  // List loci with optional filters (JSON:API REST format)
  async listLoci(params: Record<string, string | number>): Promise<AntaresLocus[]> {
    const cacheKey = this.getCacheKey('list', params);
    const cached = this.getCached<AntaresLocus[]>(cacheKey);
    if (cached) {
      console.log('Returning cached list results');
      return cached;
    }

    try {
      const response = await this.client.get<AntaresListResponse>('/loci', { params });
      const loci = response.data.data.map(l => this.listingToLocus(l));
      this.setCache(cacheKey, loci);
      return loci;
    } catch (error) {
      console.error('ANTARES list error:', error);
      throw new Error(`Failed to search ANTARES: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get available tags for filtering
  async getAvailableTags(): Promise<string[]> {
    const cacheKey = this.getCacheKey('getTags');
    const cached = this.getCached<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.get<{ data: Array<{ id: string }> }>('/tags', {
        params: { 'page[limit]': 100 },
      });
      const tags = response.data.data.map(t => t.id);
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

  // Search for bright objects suitable for amateur telescopes
  async searchBrightObjects(maxMagnitude: number = 14, tags?: string[]): Promise<AntaresLocus[]> {
    const params: Record<string, string | number> = {
      'sort': 'properties.brightest_alert_magnitude',
      'page[limit]': 500,
    };

    if (tags && tags.length > 0) {
      // API supports one tag filter at a time; use the first selected tag
      params['filter[tag]'] = tags[0];
    }

    const loci = await this.listLoci(params);

    // Filter client-side by magnitude (API sorts but doesn't filter by value)
    return loci.filter(l => {
      const mag = l.properties.brightest_alert_magnitude ?? l.properties.newest_alert_magnitude;
      return mag !== undefined && mag <= maxMagnitude;
    });
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


