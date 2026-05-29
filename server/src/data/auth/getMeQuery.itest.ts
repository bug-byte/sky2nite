import { describe, it, expect } from '@jest/globals';
import { getMeQuery } from './getMeQuery.js';

describe('getMeQuery', () => {
  it('wraps the auth user in a result object', () => {
    const user = { id: 1, username: 'alice' };
    expect(getMeQuery(user)).toEqual({ user });
  });

  it('preserves the exact user reference', () => {
    const user = { id: 42, username: 'bob' };
    expect(getMeQuery(user).user).toBe(user);
  });
});
