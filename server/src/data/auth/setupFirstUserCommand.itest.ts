import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../../services/db.js', () => ({
  default: { query: mockQuery },
}));

const { setupFirstUserCommand } = await import('./setupFirstUserCommand.js');

describe('setupFirstUserCommand', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('creates the first user and returns an auth token', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, username: 'alice' }] });

    const result = await setupFirstUserCommand({ username: 'alice', password: 'password123' });

    expect(result.user).toEqual({ id: 1, username: 'alice' });
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
  });

  it('normalizes whitespace from username before inserting', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ id: 2, username: 'bob' }] });

    await setupFirstUserCommand({ username: '  bob  ', password: 'password123' });

    // The normalized (trimmed) username is passed as the first INSERT parameter
    const insertCallArgs = mockQuery.mock.calls[1][1] as unknown[];
    expect(insertCallArgs[0]).toBe('bob');
  });

  it('throws when setup has already been completed', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });

    await expect(setupFirstUserCommand({ username: 'alice', password: 'password123' }))
      .rejects.toThrow('Initial setup has already been completed.');
  });

  it('throws and makes no DB call when username is too short', async () => {
    await expect(setupFirstUserCommand({ username: 'ab', password: 'password123' }))
      .rejects.toThrow('Username must be between 3 and 64 characters.');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('throws and makes no DB call when username is too long', async () => {
    await expect(setupFirstUserCommand({ username: 'a'.repeat(65), password: 'password123' }))
      .rejects.toThrow('Username must be between 3 and 64 characters.');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('throws and makes no DB call when password is too short', async () => {
    await expect(setupFirstUserCommand({ username: 'alice', password: 'short' }))
      .rejects.toThrow('Password must be between 8 and 128 characters.');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('throws and makes no DB call when password is too long', async () => {
    await expect(setupFirstUserCommand({ username: 'alice', password: 'p'.repeat(129) }))
      .rejects.toThrow('Password must be between 8 and 128 characters.');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
