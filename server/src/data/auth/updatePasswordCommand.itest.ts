import bcrypt from 'bcryptjs';
import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../../services/db.js', () => ({
  default: { query: mockQuery },
}));

const { updatePasswordCommand } = await import('./updatePasswordCommand.js');

const authUser = { id: 1, username: 'alice' };

describe('updatePasswordCommand', () => {
  const currentPassword = 'currentpass123';
  let currentHash: string;

  beforeAll(async () => {
    currentHash = await bcrypt.hash(currentPassword, 10);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it('updates the password and returns success', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ password_hash: currentHash }] }) // SELECT
      .mockResolvedValueOnce({ rows: [] });                               // UPDATE

    const result = await updatePasswordCommand(authUser, {
      currentPassword,
      newPassword: 'newpassword456',
    });

    expect(result).toEqual({ success: true });
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('throws when the current password is incorrect', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ password_hash: currentHash }] });

    await expect(updatePasswordCommand(authUser, {
      currentPassword: 'wrongpassword',
      newPassword: 'newpassword456',
    })).rejects.toThrow('Current password is incorrect.');
  });

  it('throws when the user is not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(updatePasswordCommand(authUser, {
      currentPassword,
      newPassword: 'newpassword456',
    })).rejects.toThrow('User not found.');
  });

  it('throws when the new password is too short', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ password_hash: currentHash }] });

    await expect(updatePasswordCommand(authUser, {
      currentPassword,
      newPassword: 'short',
    })).rejects.toThrow('Password must be between 8 and 128 characters.');
  });

  it('throws when the new password is too long', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ password_hash: currentHash }] });

    await expect(updatePasswordCommand(authUser, {
      currentPassword,
      newPassword: 'p'.repeat(129),
    })).rejects.toThrow('Password must be between 8 and 128 characters.');
  });
});
