import { Router } from 'express';
import { responder } from '../util/apiHelper.js';
import { getObservationsQuery } from '../../data/observations/getObservationsQuery.js';
import { saveObservationCommand } from '../../data/observations/saveObservationCommand.js';
import { deleteObservationCommand } from '../../data/observations/deleteObservationCommand.js';
import type { AuthenticatedRequest } from '../auth/authMiddleware.js';

const observationsRouter = Router();

observationsRouter.get(
  '/',
  responder((req) => getObservationsQuery((req as AuthenticatedRequest).authUser!.id)),
);

observationsRouter.post(
  '/',
  responder((req) => saveObservationCommand((req as AuthenticatedRequest).authUser!.id, req.body)),
);

observationsRouter.delete(
  '/:id',
  responder((req) => {
    const id = parseInt(req.params!.id, 10);
    if (!Number.isFinite(id)) throw new Error('Invalid observation ID.');
    return deleteObservationCommand((req as AuthenticatedRequest).authUser!.id, id);
  }),
);

export { observationsRouter };
