import type { NextFunction, Request, Response } from 'express';
import { verifyAuthToken, type AuthUser } from '../../util/auth.js';
import { getGuestModeQuery } from '../../data/auth/getGuestModeQuery.js';

export type AuthenticatedRequest = Request & {
  authUser?: AuthUser;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ err: 'Authentication required.' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const user = verifyAuthToken(token);
  if (!user) {
    res.status(401).json({ err: 'Invalid or expired authentication token.' });
    return;
  }

  (req as AuthenticatedRequest).authUser = user;
  next();
}

export async function requireAuthOrGuestMode(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    const user = verifyAuthToken(token);
    if (user) {
      (req as AuthenticatedRequest).authUser = user;
      return next();
    }
  }

  const { guestModeEnabled } = await getGuestModeQuery();
  if (guestModeEnabled) {
    return next();
  }

  res.status(401).json({ err: 'Authentication required.' });
}
