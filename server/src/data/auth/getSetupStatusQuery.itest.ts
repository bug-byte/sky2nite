import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../../services/db.js', () => ({
  default: { query: mockQuery },
}));

const { getSetupStatusQuery } = await import('./getSetupStatusQuery.js');

describe('getSetupStatusQuery', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns isSetupComplete: false when no users exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
    const result = await getSetupStatusQuery();
    expect(result).toEqual({ isSetupComplete: false });
  });

  it('returns isSetupComplete: true when users exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] });
    const result = await getSetupStatusQuery();
    expect(result).toEqual({ isSetupComplete: true });
  });

  it('treats a missing count row as zero users', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getSetupStatusQuery();
    expect(result).toEqual({ isSetupComplete: false });
  });
});
