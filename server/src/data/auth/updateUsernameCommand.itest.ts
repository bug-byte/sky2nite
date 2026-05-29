import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../../services/db.js', () => ({
  default: { query: mockQuery },
}));

const { updateUsernameCommand } = await import('./updateUsernameCommand.js');

const authUser = { id: 1, username: 'alice' };

describe('updateUsernameCommand', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('updates the username and returns a new token', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })                               // no conflict
      .mockResolvedValueOnce({ rows: [{ id: 1, username: 'alice2' }] }); // UPDATE

    const result = await updateUsernameCommand(authUser, { username: 'alice2' });

    expect(result.user).toEqual({ id: 1, username: 'alice2' });
    expect(typeof result.token).toBe('string');
  });

  it('normalizes whitespace from the new username', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1, username: 'alice2' }] });

    await updateUsernameCommand(authUser, { username: '  alice2  ' });

    // The conflict-check query receives the trimmed value
    expect(mockQuery).toHaveBeenNthCalledWith(1, expect.any(String), ['alice2', authUser.id]);
  });

  it('throws when the username is already taken by another user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2 }] }); // conflict

    await expect(updateUsernameCommand(authUser, { username: 'bob' }))
      .rejects.toThrow('That username is already taken.');
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('throws and makes no DB call when new username is too short', async () => {
    await expect(updateUsernameCommand(authUser, { username: 'ab' }))
      .rejects.toThrow('Username must be between 3 and 64 characters.');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('throws and makes no DB call when new username is too long', async () => {
    await expect(updateUsernameCommand(authUser, { username: 'a'.repeat(65) }))
      .rejects.toThrow('Username must be between 3 and 64 characters.');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
