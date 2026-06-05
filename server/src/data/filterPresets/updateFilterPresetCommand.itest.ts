import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../../services/db.js', () => ({
  default: { query: mockQuery },
}));

const { updateFilterPresetCommand } = await import('./updateFilterPresetCommand.js');

const makeRow = (overrides: object = {}) => ({
  id: 5,
  user_id: 42,
  name: 'My usual setup',
  max_magnitude: 14,
  min_altitude: 20,
  min_alerts: 5,
  object_types: ['variable', 'cv'],
  visibility_start: '22:00',
  visibility_end: '04:00',
  created_at: new Date('2025-06-01T00:00:00Z'),
  updated_at: new Date('2025-06-02T00:00:00Z'),
  ...overrides,
});

describe('updateFilterPresetCommand', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('updates the preset and returns the mapped row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow()] });

    const result = await updateFilterPresetCommand(42, 5, { name: 'My usual setup' });

    expect(result).toMatchObject({
      id: 5,
      userId: 42,
      name: 'My usual setup',
      maxMagnitude: 14,
      minAltitude: 20,
      minAlerts: 5,
    });
  });

  it('trims the preset name when renaming', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow({ name: 'Renamed' })] });

    await updateFilterPresetCommand(42, 5, { name: '  Renamed  ' });

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[2]).toBe('Renamed');
  });

  it('throws when the new name is empty', async () => {
    await expect(updateFilterPresetCommand(42, 5, { name: '   ' }))
      .rejects.toThrow('Preset name is required.');
  });

  it('throws when no row is found (wrong id or wrong user)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(updateFilterPresetCommand(42, 999, { name: 'X' }))
      .rejects.toThrow('Filter preset not found.');
  });

  it('passes presetId and userId as the first two query parameters', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow()] });

    await updateFilterPresetCommand(99, 7, { name: 'X' });

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe(7);
    expect(params[1]).toBe(99);
  });

  it('propagates errors thrown by the DB pool', async () => {
    mockQuery.mockRejectedValueOnce(new Error('update failed'));

    await expect(updateFilterPresetCommand(42, 5, { name: 'X' })).rejects.toThrow('update failed');
  });
});
