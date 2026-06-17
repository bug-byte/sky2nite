import { Router } from 'express';
import { responder } from '../util/apiHelper.js';
import { getSetupStatusQuery } from '../../data/auth/getSetupStatusQuery.js';
import { setupFirstUserCommand } from '../../data/auth/setupFirstUserCommand.js';
import { loginCommand } from '../../data/auth/loginCommand.js';
import { getMeQuery } from '../../data/auth/getMeQuery.js';
import { updateUsernameCommand } from '../../data/auth/updateUsernameCommand.js';
import { updatePasswordCommand } from '../../data/auth/updatePasswordCommand.js';
import { getGuestModeQuery } from '../../data/auth/getGuestModeQuery.js';
import { requireAuth } from './authMiddleware.js';
import type { AuthenticatedRequest } from './authMiddleware.js';

const authRouter = Router();

authRouter.get(
  '/setup-status',
  responder(() => getSetupStatusQuery()),
);

authRouter.get(
  '/guest-mode',
  responder(() => getGuestModeQuery()),
);

authRouter.post(
  '/setup',
  responder((req) => setupFirstUserCommand(req.body)),
);

authRouter.post(
  '/login',
  responder((req) => loginCommand(req.body)),
);

authRouter.get(
  '/me',
  requireAuth,
  responder((req) => Promise.resolve(getMeQuery((req as AuthenticatedRequest).authUser!))),
);

authRouter.patch(
  '/me/username',
  requireAuth,
  responder((req) => updateUsernameCommand((req as AuthenticatedRequest).authUser!, req.body)),
);

authRouter.patch(
  '/me/password',
  requireAuth,
  responder((req) => updatePasswordCommand((req as AuthenticatedRequest).authUser!, req.body)),
);

export { authRouter };
