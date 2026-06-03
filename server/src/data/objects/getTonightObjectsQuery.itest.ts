import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { SearchRequest } from 'shared/types.js';

const mockFetchLoci = jest.fn();
const mockFetchAlertActivityCurve = jest.fn();
const mockNightWindow = jest.fn();
const mockVisibility = jest.fn();

jest.unstable_mockModule('../../services/antaresApi.js', () => ({
  antaresApi: { fetchLociAtOffset: mockFetchLoci, fetchAlertActivityCurve: mockFetchAlertActivityCurve },
}));
jest.unstable_mockModule('../../util/astronomy.js', () => ({
  calculateNightWindow: mockNightWindow,
  calculateVisibility: mockVisibility,
}));

const { getTonightObjectsQuery } = await import('./getTonightObjectsQuery.js');

// Fixed night window for all tests
const FAKE_SUNSET = new Date('2025-01-01T02:00:00Z');
const FAKE_SUNRISE = new Date('2025-01-01T10:00:00Z');
const FAKE_NIGHT_WINDOW = { sunset: FAKE_SUNSET, sunrise: FAKE_SUNRISE };

const FAKE_VISIBILITY_WINDOW = {
  start: '2025-01-01T03:00:00.000Z',
  end: '2025-01-01T08:00:00.000Z',
  duration: 5.0,
};
const VISIBLE = { isVisible: true, visibilityWindow: FAKE_VISIBILITY_WINDOW, maxAltitude: 45.0 };
const NOT_VISIBLE = { isVisible: false, visibilityWindow: null, maxAltitude: 10.0 };

const BASE_REQUEST: SearchRequest = {
  latitude: 40.7128,
  longitude: -74.006,
  date: '2025-01-01',
};

function makeLocus(id: string, mag: number, tags: string[] = [], ra = 180, dec = 0, numAlerts = 5) {
  return {
    locus_id: id,
    ra,
    dec,
    tags,
    properties: {
      brightest_alert_magnitude: mag,
      num_alerts: numAlerts,
      ztf_object_id: `ZTF_${id}`,
    },
  };
}

function emptyAntaresBatch() {
  mockFetchLoci.mockResolvedValueOnce({ loci: [], antaresTotalLoci: 0, hasNextPage: false });
}

describe('getTonightObjectsQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNightWindow.mockReturnValue(FAKE_NIGHT_WINDOW);
  });

  // --- Input validation (throws before any external call) ---

  it('throws on latitude below -90', async () => {
    await expect(getTonightObjectsQuery({ ...BASE_REQUEST, latitude: -91 }))
      .rejects.toThrow('Invalid latitude. Must be between -90 and 90.');
  });

  it('throws on latitude above 90', async () => {
    await expect(getTonightObjectsQuery({ ...BASE_REQUEST, latitude: 91 }))
      .rejects.toThrow('Invalid latitude. Must be between -90 and 90.');
  });

  it('throws on longitude below -180', async () => {
    await expect(getTonightObjectsQuery({ ...BASE_REQUEST, longitude: -181 }))
      .rejects.toThrow('Invalid longitude. Must be between -180 and 180.');
  });

  it('throws on longitude above 180', async () => {
    await expect(getTonightObjectsQuery({ ...BASE_REQUEST, longitude: 181 }))
      .rejects.toThrow('Invalid longitude. Must be between -180 and 180.');
  });

  it('throws on an unparseable date string', async () => {
    await expect(getTonightObjectsQuery({ ...BASE_REQUEST, date: 'not-a-date' }))
      .rejects.toThrow('Invalid date format.');
  });

  // --- Response shape ---

  it('includes location and night window in the response', async () => {
    emptyAntaresBatch();

    const result = await getTonightObjectsQuery(BASE_REQUEST);

    expect(result.location).toEqual({ latitude: BASE_REQUEST.latitude, longitude: BASE_REQUEST.longitude });
    expect(result.nightWindow.sunset).toBe(FAKE_SUNSET.toISOString());
    expect(result.nightWindow.sunrise).toBe(FAKE_SUNRISE.toISOString());
  });

  it('returns empty results when ANTARES has no objects', async () => {
    emptyAntaresBatch();

    const result = await getTonightObjectsQuery(BASE_REQUEST);

    expect(result.objects).toHaveLength(0);
    expect(result.count).toBe(0);
    expect(result.pagination.hasNextPage).toBe(false);
    expect(result.pagination.nextCursor).toBeNull();
  });

  // --- Happy path ---

  it('returns visible objects from a single ANTARES batch', async () => {
    mockFetchLoci.mockResolvedValueOnce({
      loci: [makeLocus('L1', 12.0)],
      antaresTotalLoci: 1,
      hasNextPage: false,
    });
    mockVisibility.mockReturnValueOnce(VISIBLE);

    const result = await getTonightObjectsQuery(BASE_REQUEST);

    expect(result.objects).toHaveLength(1);
    expect(result.objects[0].locusId).toBe('L1');
    expect(result.objects[0].magnitude).toBe(12.0);
    expect(result.objects[0].visibilityWindow).toEqual(FAKE_VISIBILITY_WINDOW);
    expect(result.objects[0].maxAltitude).toBe(45.0);
  });

  it('includes ztf object IDs in the result', async () => {
    mockFetchLoci.mockResolvedValueOnce({
      loci: [makeLocus('L1', 12.0)],
      antaresTotalLoci: 1,
      hasNextPage: false,
    });
    mockVisibility.mockReturnValueOnce(VISIBLE);

    const result = await getTonightObjectsQuery(BASE_REQUEST);

    expect(result.objects[0].objectIds.ztf).toBe('ZTF_L1');
    expect(result.objects[0].antaresUrl).toContain('L1');
  });

  it('attaches an alert activity curve when requested', async () => {
    mockFetchLoci.mockResolvedValueOnce({
      loci: [makeLocus('L1', 12.0, [], 180, 0, 5)],
      antaresTotalLoci: 1,
      hasNextPage: false,
    });
    mockVisibility.mockReturnValueOnce(VISIBLE);
    mockFetchAlertActivityCurve.mockResolvedValueOnce([1, 2, 1]);

    const result = await getTonightObjectsQuery({
      ...BASE_REQUEST,
      includeAlertActivity: true,
    });

    expect(mockFetchAlertActivityCurve).toHaveBeenCalledWith('L1', 5);
    expect(result.objects[0].alertActivityCurve).toEqual([1, 2, 1]);
  });

  // --- Magnitude filter ---

  it('excludes objects above the default magnitude threshold (14)', async () => {
    mockFetchLoci.mockResolvedValueOnce({
      loci: [makeLocus('L1', 14.5)],
      antaresTotalLoci: 1,
      hasNextPage: false,
    });

    const result = await getTonightObjectsQuery(BASE_REQUEST);

    expect(result.objects).toHaveLength(0);
  });

  it('respects a custom maxMagnitude filter', async () => {
    mockFetchLoci.mockResolvedValueOnce({
      loci: [makeLocus('L1', 11.0), makeLocus('L2', 12.5)],
      antaresTotalLoci: 2,
      hasNextPage: false,
    });
    mockVisibility.mockReturnValue(VISIBLE);

    const result = await getTonightObjectsQuery({
      ...BASE_REQUEST,
      filters: { maxMagnitude: 11 },
    });

    expect(result.objects).toHaveLength(1);
    expect(result.objects[0].locusId).toBe('L1');
  });

  it('filters out objects below the minimum alert count', async () => {
    mockFetchLoci.mockResolvedValueOnce({
      loci: [makeLocus('L1', 12.0, [], 180, 0, 3), makeLocus('L2', 12.0, [], 180, 0, 1)],
      antaresTotalLoci: 2,
      hasNextPage: false,
    });
    mockVisibility.mockReturnValue(VISIBLE);

    const result = await getTonightObjectsQuery({
      ...BASE_REQUEST,
      filters: { minAlerts: 2 },
    });

    expect(result.objects).toHaveLength(1);
    expect(result.objects[0].locusId).toBe('L1');
    expect(result.objects[0].numAlerts).toBe(3);
  });

  // --- Visibility filter ---

  it('excludes objects that are not visible at the observation site', async () => {
    mockFetchLoci.mockResolvedValueOnce({
      loci: [makeLocus('L1', 12.0)],
      antaresTotalLoci: 1,
      hasNextPage: false,
    });
    mockVisibility.mockReturnValueOnce(NOT_VISIBLE);

    const result = await getTonightObjectsQuery(BASE_REQUEST);

    expect(result.objects).toHaveLength(0);
  });

  // --- Tag filter ---

  it('includes objects that match all requested tags', async () => {
    const locus = makeLocus('L1', 12.0, ['nuclear transient', 'RCB star']);
    mockFetchLoci.mockResolvedValueOnce({ loci: [locus], antaresTotalLoci: 1, hasNextPage: false });
    mockVisibility.mockReturnValueOnce(VISIBLE);

    const result = await getTonightObjectsQuery({
      ...BASE_REQUEST,
      filters: { objectTypes: ['nuclear transient'] },
    });

    expect(result.objects).toHaveLength(1);
  });

  it('excludes objects missing any of the required tags', async () => {
    const locus = makeLocus('L1', 12.0, ['RCB star']); // missing 'nuclear transient'
    mockFetchLoci.mockResolvedValueOnce({ loci: [locus], antaresTotalLoci: 1, hasNextPage: false });

    const result = await getTonightObjectsQuery({
      ...BASE_REQUEST,
      filters: { objectTypes: ['nuclear transient'] },
    });

    expect(result.objects).toHaveLength(0);
  });

  // --- Pagination ---

  it('sets hasNextPage and nextCursor when the page fills before the batch ends', async () => {
    mockFetchLoci.mockResolvedValueOnce({
      loci: [makeLocus('L1', 12.0), makeLocus('L2', 11.0)],
      antaresTotalLoci: 10,
      hasNextPage: true,
    });
    mockVisibility.mockReturnValue(VISIBLE);

    const result = await getTonightObjectsQuery({
      ...BASE_REQUEST,
      pagination: { pageSize: 1 },
    });

    expect(result.objects).toHaveLength(1);
    expect(result.pagination.hasNextPage).toBe(true);
    expect(result.pagination.nextCursor).not.toBeNull();
  });

  it('sets hasNextPage: false when all objects fit on one page', async () => {
    mockFetchLoci.mockResolvedValueOnce({
      loci: [makeLocus('L1', 12.0)],
      antaresTotalLoci: 1,
      hasNextPage: false,
    });
    mockVisibility.mockReturnValueOnce(VISIBLE);

    const result = await getTonightObjectsQuery({
      ...BASE_REQUEST,
      pagination: { pageSize: 10 },
    });

    expect(result.pagination.hasNextPage).toBe(false);
    expect(result.pagination.nextCursor).toBeNull();
  });

  it('respects the cursor to start from an offset', async () => {
    emptyAntaresBatch();

    await getTonightObjectsQuery({
      ...BASE_REQUEST,
      pagination: { cursor: 50 },
    });

    expect(mockFetchLoci).toHaveBeenCalledWith(50, expect.any(Number));
  });
});
