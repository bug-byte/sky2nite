import bcrypt from 'bcryptjs';
import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../../services/db.js', () => ({
  default: { query: mockQuery },
}));

const { loginCommand } = await import('./loginCommand.js');

describe('loginCommand', () => {
  const password = 'password123';
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 10);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  function userRow() {
    return { id: 1, username: 'alice', password_hash: passwordHash };
  }

  it('returns user and token on valid credentials', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [userRow()] })
      .mockResolvedValueOnce({ rows: [] }); // UPDATE last_login_at

    const result = await loginCommand({ username: 'alice', password });

    expect(result.user).toEqual({ id: 1, username: 'alice' });
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
  });

  it('performs case-insensitive username lookup', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [userRow()] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await loginCommand({ username: 'ALICE', password });

    expect(result.user.username).toBe('alice');
  });

  it('trims whitespace from username before querying', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [userRow()] })
      .mockResolvedValueOnce({ rows: [] });

    await loginCommand({ username: '  alice  ', password });

    expect(mockQuery).toHaveBeenNthCalledWith(1, expect.any(String), ['alice']);
  });

  it('updates last_login_at after a successful login', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [userRow()] })
      .mockResolvedValueOnce({ rows: [] });

    await loginCommand({ username: 'alice', password });

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenNthCalledWith(2, expect.any(String), [1]);
  });

  it('throws on an incorrect password', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [userRow()] });

    await expect(loginCommand({ username: 'alice', password: 'wrongpassword' }))
      .rejects.toThrow('Invalid username or password.');
  });

  it('throws when the user does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(loginCommand({ username: 'nobody', password }))
      .rejects.toThrow('Invalid username or password.');
  });
});
