import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../../services/db.js', () => ({
  default: { query: mockQuery },
}));

const { getFilterPresetsQuery } = await import('./getFilterPresetsQuery.js');

const makeRow = (overrides: object = {}) => ({
  id: 1,
  user_id: 42,
  name: 'Supernovae only',
  max_magnitude: 16,
  min_altitude: 30,
  min_alerts: 10,
  object_types: ['nuclear transient'],
  visibility_start: '21:00',
  visibility_end: '03:00',
  created_at: new Date('2025-06-01T00:00:00Z'),
  updated_at: new Date('2025-06-02T00:00:00Z'),
  ...overrides,
});

describe('getFilterPresetsQuery', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns presets mapped from rows', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow()] });

    const result = await getFilterPresetsQuery(42);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 1,
      userId: 42,
      name: 'Supernovae only',
      maxMagnitude: 16,
      minAltitude: 30,
      minAlerts: 10,
      objectTypes: ['nuclear transient'],
      visibilityStart: '21:00',
      visibilityEnd: '03:00',
    });
    expect(result[0].createdAt).toBe('2025-06-01T00:00:00.000Z');
    expect(result[0].updatedAt).toBe('2025-06-02T00:00:00.000Z');
  });

  it('converts null numeric columns to undefined', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [makeRow({ max_magnitude: null, min_altitude: null, min_alerts: null })],
    });

    const result = await getFilterPresetsQuery(42);

    expect(result[0].maxMagnitude).toBeUndefined();
    expect(result[0].minAltitude).toBeUndefined();
    expect(result[0].minAlerts).toBeUndefined();
  });

  it('returns an empty array when the user has no presets', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getFilterPresetsQuery(42);

    expect(result).toEqual([]);
  });

  it('passes userId as the first query parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getFilterPresetsQuery(99);

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe(99);
  });

  it('propagates errors thrown by the DB pool', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection lost'));

    await expect(getFilterPresetsQuery(42)).rejects.toThrow('connection lost');
  });
});
