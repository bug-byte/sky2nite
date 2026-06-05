import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../../services/db.js', () => ({
  default: { query: mockQuery },
}));

const { updateObservationCommand } = await import('./updateObservationCommand.js');

const makeReturnedRow = (overrides: object = {}) => ({
  id: 7,
  user_id: 42,
  locus_id: 'ANT2025abc123',
  ra: 123.456,
  dec: -45.678,
  magnitude: 12.3,
  num_alerts: 39,
  transit_time: new Date('2025-01-01T23:30:00Z'),
  tags: ['nuclear transient'],
  visibility_start: new Date('2025-01-01T21:00:00Z'),
  visibility_end: new Date('2025-01-02T03:00:00Z'),
  visibility_duration: 6.0,
  max_altitude: 72.5,
  ztf_object_id: 'ZTF25abc',
  lsst_dia_object_id: null,
  antares_url: 'https://antares.noirlab.edu/loci/ANT2025abc123',
  notes: '',
  status: 'planned',
  rating: null,
  saved_at: new Date('2025-01-01T20:00:00Z'),
  ...overrides,
});

describe('updateObservationCommand', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns the updated observation mapped from the RETURNING row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow({ notes: 'Saw it clearly', status: 'observed', rating: 4 })] });

    const result = await updateObservationCommand(42, 7, { notes: 'Saw it clearly', status: 'observed', rating: 4 });

    expect(result).toMatchObject({
      id: 7,
      userId: 42,
      locusId: 'ANT2025abc123',
      notes: 'Saw it clearly',
      status: 'observed',
      rating: 4,
      numAlerts: 39,
    });
  });

  it('maps transitTime to an ISO string', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow()] });

    const result = await updateObservationCommand(42, 7, {});

    expect(result.transitTime).toBe('2025-01-01T23:30:00.000Z');
  });

  it('returns undefined transitTime when the column is null', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow({ transit_time: null })] });

    const result = await updateObservationCommand(42, 7, {});

    expect(result.transitTime).toBeUndefined();
  });

  it('returns undefined numAlerts when the column is null', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow({ num_alerts: null })] });

    const result = await updateObservationCommand(42, 7, {});

    expect(result.numAlerts).toBeUndefined();
  });

  it('passes id and userId as the first two query parameters', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow()] });

    await updateObservationCommand(42, 7, { notes: 'test' });

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe(7);   // $1 = id
    expect(params[1]).toBe(42);  // $2 = user_id
  });

  it('passes notes as the third query parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow({ notes: 'Good conditions' })] });

    await updateObservationCommand(42, 7, { notes: 'Good conditions' });

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[2]).toBe('Good conditions'); // $3 = notes
  });

  it('passes null for notes when not provided (preserving existing via COALESCE)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow()] });

    await updateObservationCommand(42, 7, { status: 'skipped' });

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[2]).toBeNull(); // $3 = notes → null → COALESCE keeps existing
  });

  it('passes status as the fourth query parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow({ status: 'observed' })] });

    await updateObservationCommand(42, 7, { status: 'observed' });

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[3]).toBe('observed'); // $4 = status
  });

  it('passes null for status when not provided (preserving existing via COALESCE)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow()] });

    await updateObservationCommand(42, 7, { notes: 'just notes' });

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[3]).toBeNull(); // $4 = status → null → COALESCE keeps existing
  });

  it('passes rating as the fifth query parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow({ rating: 5 })] });

    await updateObservationCommand(42, 7, { rating: 5 });

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[4]).toBe(5); // $5 = rating
  });

  it('passes null for rating when explicitly set to null', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow({ rating: null })] });

    await updateObservationCommand(42, 7, { rating: null });

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[4]).toBeNull(); // $5 = rating
  });

  it('passes null for rating when rating is not in the request body', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow()] });

    await updateObservationCommand(42, 7, { notes: 'no rating' });

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[4]).toBeNull();
  });

  it('maps status to "planned" when the column is null', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow({ status: null })] });

    const result = await updateObservationCommand(42, 7, {});

    expect(result.status).toBe('planned');
  });

  it('maps rating to null when the column is null', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeReturnedRow({ rating: null })] });

    const result = await updateObservationCommand(42, 7, {});

    expect(result.rating).toBeNull();
  });

  it('throws when no row is returned (not found or wrong user)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(updateObservationCommand(42, 999, {})).rejects.toThrow('Observation not found or access denied.');
  });

  it('propagates errors thrown by the DB pool', async () => {
    mockQuery.mockRejectedValueOnce(new Error('update failed'));

    await expect(updateObservationCommand(42, 7, { notes: 'test' })).rejects.toThrow('update failed');
  });
});
