import type { AuthUser, GetMeResult } from 'shared/types.js';

export function getMeQuery(authUser: AuthUser): GetMeResult {
  return { user: authUser };
}
