import type { NextFunction, Request, Response } from 'express';
import { verifyAuthToken, type AuthUser } from '../../util/auth.js';

export interface AuthenticatedRequest extends Request {
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
