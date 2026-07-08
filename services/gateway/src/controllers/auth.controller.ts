import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import {
  authenticateUser,
  refreshSession,
  registerUser,
  revokeRefreshToken,
} from '../services/auth.service';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10, 'Password must be at least 10 characters'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = credentialsSchema.parse(req.body);
    const result = await registerUser(email, password);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = credentialsSchema.parse(req.body);
    const result = await authenticateUser(email, password);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    const result = await refreshSession(refreshToken);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    await revokeRefreshToken(refreshToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
