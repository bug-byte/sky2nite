import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../../services/db.js', () => ({
  default: { query: mockQuery },
}));

const { createFilterPresetCommand } = await import('./createFilterPresetCommand.js');

const baseBody = {
  name: 'Supernovae only',
  maxMagnitude: 16,
  minAltitude: 30,
  minAlerts: 10,
  objectTypes: ['nuclear transient'],
  visibilityStart: '21:00',
  visibilityEnd: '03:00',
};

const makeReturnedRow = (overrides: object = {}) => ({
  id: 7,
  user_id: 42,
  name: 'Supernovae only',
  max_magnitude: 16,
  min_altitude: 30,
  min_alerts: 10,
  object_types: ['nuclear transient'],
  visibility_start: '21:00',
  visibility_end: '03:00',
  created_at: new Date('2025-06-01T00:00:00Z'),
  updated_at: new Date('2025-06-01T00:00:00Z'),
  ...overrides,
});

describe('createFilterPresetCommand', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('inserts the preset and returns the mapped row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow()] });

    const result = await createFilterPresetCommand(42, baseBody);

    expect(result).toMatchObject({
      id: 7,
      userId: 42,
      name: 'Supernovae only',
      maxMagnitude: 16,
      minAltitude: 30,
      minAlerts: 10,
      objectTypes: ['nuclear transient'],
      visibilityStart: '21:00',
      visibilityEnd: '03:00',
    });
  });

  it('trims the preset name', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow({ name: 'Trimmed' })] });

    await createFilterPresetCommand(42, { ...baseBody, name: '  Trimmed  ' });

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[1]).toBe('Trimmed');
  });

  it('throws when name is empty', async () => {
    await expect(createFilterPresetCommand(42, { ...baseBody, name: '   ' }))
      .rejects.toThrow('Preset name is required.');
  });

  it('throws when name is missing', async () => {
    await expect(createFilterPresetCommand(42, { ...baseBody, name: '' }))
      .rejects.toThrow('Preset name is required.');
  });

  it('throws when name is too long', async () => {
    await expect(createFilterPresetCommand(42, { ...baseBody, name: 'x'.repeat(81) }))
      .rejects.toThrow('Preset name must be 80 characters or fewer.');
  });

  it('passes userId as the first query parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow()] });

    await createFilterPresetCommand(99, baseBody);

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe(99);
  });

  it('defaults optional fields to null/empty values when not provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow()] });

    await createFilterPresetCommand(42, { name: 'Minimal' });

    const params = mockQuery.mock.calls[0][1] as unknown[];
    // max_magnitude, min_altitude, min_alerts become null
    expect(params[2]).toBeNull();
    expect(params[3]).toBeNull();
    expect(params[4]).toBeNull();
    // object_types defaults to empty array
    expect(params[5]).toEqual([]);
    // visibility_start/end default to empty strings
    expect(params[6]).toBe('');
    expect(params[7]).toBe('');
  });

  it('propagates errors thrown by the DB pool', async () => {
    mockQuery.mockRejectedValueOnce(new Error('insert failed'));

    await expect(createFilterPresetCommand(42, baseBody)).rejects.toThrow('insert failed');
  });
});
