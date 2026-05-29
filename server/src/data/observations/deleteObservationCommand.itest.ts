import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../../services/db.js', () => ({
  default: { query: mockQuery },
}));

const { deleteObservationCommand } = await import('./deleteObservationCommand.js');

describe('deleteObservationCommand', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns { success: true } when the row is deleted', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 5 }] });

    const result = await deleteObservationCommand(42, 5);

    expect(result).toEqual({ success: true });
  });

  it('passes observationId as the first query parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 7 }] });

    await deleteObservationCommand(42, 7);

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe(7);
  });

  it('passes userId as the second query parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 7 }] });

    await deleteObservationCommand(99, 7);

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[1]).toBe(99);
  });

  it('throws when no row is deleted (not found or wrong user)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(deleteObservationCommand(42, 999)).rejects.toThrow('Observation not found.');
  });

  it('makes exactly one DB call', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    await deleteObservationCommand(1, 1);

    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('propagates errors thrown by the DB pool', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection lost'));

    await expect(deleteObservationCommand(42, 5)).rejects.toThrow('connection lost');
  });
});
