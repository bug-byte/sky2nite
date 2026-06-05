import { Router } from 'express';
import { responder } from '../util/apiHelper.js';
import { getFilterPresetsQuery } from '../../data/filterPresets/getFilterPresetsQuery.js';
import { createFilterPresetCommand } from '../../data/filterPresets/createFilterPresetCommand.js';
import { updateFilterPresetCommand } from '../../data/filterPresets/updateFilterPresetCommand.js';
import { deleteFilterPresetCommand } from '../../data/filterPresets/deleteFilterPresetCommand.js';
import type { AuthenticatedRequest } from '../auth/authMiddleware.js';
import type { UpdateFilterPresetRequest } from 'shared/types.js';

const filterPresetsRouter = Router();

filterPresetsRouter.get(
  '/',
  responder((req) => getFilterPresetsQuery((req as AuthenticatedRequest).authUser!.id)),
);

filterPresetsRouter.post(
  '/',
  responder((req) => createFilterPresetCommand((req as AuthenticatedRequest).authUser!.id, req.body)),
);

filterPresetsRouter.patch(
  '/:id',
  responder((req) => {
    const id = parseInt(req.params!.id, 10);
    if (!Number.isFinite(id)) throw new Error('Invalid preset ID.');
    return updateFilterPresetCommand(
      (req as AuthenticatedRequest).authUser!.id,
      id,
      req.body as UpdateFilterPresetRequest,
    );
  }),
);

filterPresetsRouter.delete(
  '/:id',
  responder((req) => {
    const id = parseInt(req.params!.id, 10);
    if (!Number.isFinite(id)) throw new Error('Invalid preset ID.');
    return deleteFilterPresetCommand((req as AuthenticatedRequest).authUser!.id, id);
  }),
);

export { filterPresetsRouter };
