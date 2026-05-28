import { Router } from 'express';
import { responder } from '../util/apiHelper.js';
import {
  getUserCount,
  issueAuthToken,
  setupFirstUser,
  updatePassword,
  updateUsername,
  validateUserCredentials,
} from '../../services/auth.js';
import { requireAuth } from './authMiddleware.js';
import type { AuthenticatedRequest } from './authMiddleware.js';

interface AuthPayload {
  username?: string;
  password?: string;
}

const authRouter = Router();

authRouter.get(
  '/setup-status',
  responder(async () => {
    const hasUsers = (await getUserCount()) > 0;
    return { isSetupComplete: hasUsers };
  }),
);

authRouter.post(
  '/setup',
  responder(async (req) => {
    const body = req.body as AuthPayload;
    const username = body?.username ?? '';
    const password = body?.password ?? '';

    const user = await setupFirstUser(username, password);
    const token = issueAuthToken(user);

    return { user, token };
  }),
);

authRouter.post(
  '/login',
  responder(async (req) => {
    const body = req.body as AuthPayload;
    const username = body?.username ?? '';
    const password = body?.password ?? '';

    const user = await validateUserCredentials(username, password);
    if (!user) {
      throw new Error('Invalid username or password.');
    }

    const token = issueAuthToken(user);
    return { user, token };
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  responder(async (req) => {
    const authUser = (req as AuthenticatedRequest).authUser;
    return { user: authUser };
  }),
);

authRouter.patch(
  '/me/username',
  requireAuth,
  responder(async (req) => {
    const authUser = (req as AuthenticatedRequest).authUser!;
    const body = req.body as { username?: string };
    const user = await updateUsername(authUser.id, body?.username ?? '');
    const token = issueAuthToken(user);
    return { user, token };
  }),
);

authRouter.patch(
  '/me/password',
  requireAuth,
  responder(async (req) => {
    const authUser = (req as AuthenticatedRequest).authUser!;
    const body = req.body as { currentPassword?: string; newPassword?: string };
    await updatePassword(authUser.id, body?.currentPassword ?? '', body?.newPassword ?? '');
    return { success: true };
  }),
);

export { authRouter };
