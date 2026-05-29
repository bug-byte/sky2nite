import { Router } from 'express';
import { responder } from '../util/apiHelper.js';
import { getSettingsQuery } from '../../data/settings/getSettingsQuery.js';
import { updateSettingsCommand } from '../../data/settings/updateSettingsCommand.js';
import type { AuthenticatedRequest } from '../auth/authMiddleware.js';

const settingsRouter = Router();

settingsRouter.get(
  '/',
  responder((req) => getSettingsQuery((req as AuthenticatedRequest).authUser!.id)),
);

settingsRouter.patch(
  '/',
  responder((req) => updateSettingsCommand((req as AuthenticatedRequest).authUser!.id, req.body)),
);

export { settingsRouter };
