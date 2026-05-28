import { Router } from 'express';
import { responder } from '../util/apiHelper.js';
import { getTonightObjectsQuery } from '../../data/objects/getTonightObjectsQuery.js';
import { getTagsQuery } from '../../data/objects/getTagsQuery.js';

const objectsRouter = Router();

objectsRouter.post(
  '/tonight',
  responder((req) => getTonightObjectsQuery(req.body))
);

objectsRouter.get(
  '/tags',
  responder(() => getTagsQuery())
);

objectsRouter.get(
  '/health',
  responder(() => Promise.resolve({ status: 'ok', timestamp: new Date().toISOString() }))
);

export { objectsRouter };
