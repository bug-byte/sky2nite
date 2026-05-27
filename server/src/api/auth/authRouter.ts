import { Router } from 'express';
import { responder } from '../util/apiHelper.js';
import {
  getUserCount,
  issueAuthToken,
  setupFirstUser,
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

export { authRouter };
