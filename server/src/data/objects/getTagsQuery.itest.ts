import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockGetAvailableTags = jest.fn();

jest.unstable_mockModule('../../services/antaresApi.js', () => ({
  antaresApi: { getAvailableTags: mockGetAvailableTags },
}));

const { getTagsQuery } = await import('./getTagsQuery.js');

describe('getTagsQuery', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns the tag list from ANTARES', async () => {
    const tags = ['nuclear transient', 'RCB star', 'high-amplitude pulsator'];
    mockGetAvailableTags.mockResolvedValueOnce(tags);

    const result = await getTagsQuery();

    expect(result).toEqual(tags);
    expect(mockGetAvailableTags).toHaveBeenCalledTimes(1);
  });

  it('returns an empty array when ANTARES reports no tags', async () => {
    mockGetAvailableTags.mockResolvedValueOnce([]);

    expect(await getTagsQuery()).toEqual([]);
  });

  it('propagates errors thrown by the ANTARES API', async () => {
    mockGetAvailableTags.mockRejectedValueOnce(new Error('ANTARES unavailable'));

    await expect(getTagsQuery()).rejects.toThrow('ANTARES unavailable');
  });
});
