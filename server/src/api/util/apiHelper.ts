import { Request, Response, NextFunction } from 'express';
import getLogger from '../../util/getLogger.js';

const log = getLogger('api');

// Augments Express Request with fields set by request middleware in index.ts
export type Req = Partial<Request> & {
  id: string;
  started: number;
  params?: any;
  body?: any;
  query?: any;
  ip?: string;
};

export function sendApiResult<T>(req: Req, res: Response, result: T): void {
  const body = JSON.stringify({ id: req.id, result });
  res.status(200).send(body);

  const duration = performance.now() - req.started;
  const msg = `${req.id} ${req.method} ${req.originalUrl} - ${body.length} bytes, ${Math.round(duration)} ms`;
  if (duration > 10000) {
    log.warn(msg);
  } else {
    log.info(msg);
  }
}

export function sendApiError(requestId: string, res: Response, errorMessage: string): void {
  const body = JSON.stringify({ id: requestId, err: errorMessage });
  res.status(200).send(body);
}

export const responder =
  <T>(promiser: (_: Req) => Promise<T>) =>
  (request: Request, res: Response, next: NextFunction) => {
    const req = request as Req;
    void (async () => {
      let result: T;
      try {
        result = await promiser(req);
      } catch (e) {
        next(e instanceof Error ? e : new Error(String(e)));
        return;
      }
      sendApiResult(req, res, result);
    })();
  };
