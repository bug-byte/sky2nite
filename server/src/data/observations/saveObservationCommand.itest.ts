import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../../services/db.js', () => ({
  default: { query: mockQuery },
}));

const { saveObservationCommand } = await import('./saveObservationCommand.js');

const baseRequest = {
  locusId: 'ANT2025abc123',
  ra: 123.456,
  dec: -45.678,
  magnitude: 12.3,
  tags: ['nuclear transient'],
  visibilityWindow: {
    start: '2025-01-01T21:00:00.000Z',
    end: '2025-01-02T03:00:00.000Z',
    duration: 6.0,
  },
  maxAltitude: 72.5,
  objectIds: { ztf: 'ZTF25abc', lsst: undefined },
  antaresUrl: 'https://antares.noirlab.edu/loci/ANT2025abc123',
};

const makeReturnedRow = (overrides: object = {}) => ({
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

describe('saveObservationCommand', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns the saved observation mapped from the RETURNING row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow()] });

    const result = await saveObservationCommand(42, baseRequest);

    expect(result).toMatchObject({
      id: 1,
      userId: 42,
      locusId: 'ANT2025abc123',
      ra: 123.456,
      dec: -45.678,
      magnitude: 12.3,
      maxAltitude: 72.5,
      antaresUrl: 'https://antares.noirlab.edu/loci/ANT2025abc123',
    });
    expect(result.visibilityWindow).toEqual({
      start: '2025-01-01T21:00:00.000Z',
      end: '2025-01-02T03:00:00.000Z',
      duration: 6.0,
    });
    expect(result.objectIds.ztf).toBe('ZTF25abc');
    expect(result.objectIds.lsst).toBeUndefined();
  });

  it('passes userId as the first query parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow()] });

    await saveObservationCommand(99, baseRequest);

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe(99);
  });

  it('passes locusId as the second query parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow()] });

    await saveObservationCommand(42, baseRequest);

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[1]).toBe('ANT2025abc123');
  });

  it('passes null for missing ztf objectId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow({ ztf_object_id: null })] });

    await saveObservationCommand(42, { ...baseRequest, objectIds: {} });

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[10]).toBeNull(); // ztf_object_id param index
  });

  it('defaults notes to empty string when not provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow()] });

    await saveObservationCommand(42, baseRequest); // baseRequest has no notes field

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[13]).toBe(''); // notes param index
  });

  it('passes provided notes to the query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow({ notes: 'Great view' })] });

    await saveObservationCommand(42, { ...baseRequest, notes: 'Great view' });

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[13]).toBe('Great view');
  });

  it('propagates errors thrown by the DB pool', async () => {
    mockQuery.mockRejectedValueOnce(new Error('insert failed'));

    await expect(saveObservationCommand(42, baseRequest)).rejects.toThrow('insert failed');
  });
});
