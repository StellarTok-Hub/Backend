import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config';
import { UnauthorizedError } from '../utils/appError';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

// Distinct from the OAuth state token audience so the two token types can
// never be substituted for one another even though they share a secret.
export const ACCESS_TOKEN_AUDIENCE = 'access';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing bearer token'));
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      audience: ACCESS_TOKEN_AUDIENCE,
    }) as AuthenticatedUser;
    req.user = payload;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
