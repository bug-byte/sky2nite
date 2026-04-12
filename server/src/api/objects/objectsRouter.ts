import { Router } from 'express';
import { responder } from '../util/apiHelper.js';
import { getTonightObjectsQuery } from '../../data/objects/getTonightObjectsQuery.js';
import { getTagsQuery } from '../../data/objects/getTagsQuery.js';
import type { SearchRequest } from '../../types/index.js';

const objectsRouter = Router();

objectsRouter.post(
  '/tonight',
  responder(async (req) => {
    const { latitude, longitude, date, filters = {} } = req.body as SearchRequest;
    const observationDate = date ? new Date(date) : new Date();
    if (isNaN(observationDate.getTime())) {
      throw new Error('Invalid date format.');
    }
    return getTonightObjectsQuery(
      latitude,
      longitude,
      observationDate,
      filters.maxMagnitude ?? 14,
      filters.objectTypes
    );
  })
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
