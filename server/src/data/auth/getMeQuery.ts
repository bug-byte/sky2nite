import type { AuthUser } from '../../util/auth.js';

export interface GetMeResult {
  user: AuthUser;
}

export function getMeQuery(authUser: AuthUser): GetMeResult {
  return { user: authUser };
}
