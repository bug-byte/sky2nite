import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../../services/db.js', () => ({
  default: { query: mockQuery },
}));

const { getObservationsQuery } = await import('./getObservationsQuery.js');

const makeRow = (overrides: object = {}) => ({
  id: 1,
  user_id: 42,
  locus_id: 'ANT2025abc123',
  ra: 123.456,
  dec: -45.678,
  magnitude: 12.3,
  tags: ['nuclear transient'],
  visibility_start: new Date('2025-01-01T21:00:00Z'),
  visibility_end: new Date('2025-01-02T03:00:00Z'),
  visibility_duration: 6.0,
  max_altitude: 72.5,
  ztf_object_id: 'ZTF25abc',
  lsst_dia_object_id: null,
  antares_url: 'https://antares.noirlab.edu/loci/ANT2025abc123',
  notes: '',
  saved_at: new Date('2025-01-01T20:00:00Z'),
  ...overrides,
});

describe('getObservationsQuery', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns an empty array when the user has no saved observations', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getObservationsQuery(42);

    expect(result).toEqual([]);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('maps a DB row to a SavedObservation', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow()] });

    const [obs] = await getObservationsQuery(42);

    expect(obs).toMatchObject({
      id: 1,
      userId: 42,
      locusId: 'ANT2025abc123',
      ra: 123.456,
      dec: -45.678,
      magnitude: 12.3,
      tags: ['nuclear transient'],
      maxAltitude: 72.5,
      antaresUrl: 'https://antares.noirlab.edu/loci/ANT2025abc123',
      notes: '',
    });
    expect(obs.visibilityWindow).toEqual({
      start: '2025-01-01T21:00:00.000Z',
      end: '2025-01-02T03:00:00.000Z',
      duration: 6.0,
    });
    expect(obs.objectIds.ztf).toBe('ZTF25abc');
    expect(obs.objectIds.lsst).toBeUndefined();
    expect(typeof obs.savedAt).toBe('string');
  });

  it('returns multiple rows in order', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [makeRow({ id: 10, locus_id: 'A' }), makeRow({ id: 11, locus_id: 'B' })],
    });

    const result = await getObservationsQuery(42);

    expect(result).toHaveLength(2);
    expect(result[0].locusId).toBe('A');
    expect(result[1].locusId).toBe('B');
  });

  it('passes the userId as the query parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getObservationsQuery(99);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [99],
    );
  });

  it('maps null ztf and lsst ids to undefined', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [makeRow({ ztf_object_id: null, lsst_dia_object_id: null })],
    });

    const [obs] = await getObservationsQuery(42);

    expect(obs.objectIds.ztf).toBeUndefined();
    expect(obs.objectIds.lsst).toBeUndefined();
  });

  it('propagates errors thrown by the DB pool', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection refused'));

    await expect(getObservationsQuery(42)).rejects.toThrow('connection refused');
  });
});
