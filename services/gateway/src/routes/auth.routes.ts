import { Router } from 'express';
import { login, logout, refresh, register } from '../controllers/auth.controller';
import { strictRateLimiter } from '../middleware/rateLimiter';

export const authRouter = Router();

authRouter.post('/register', strictRateLimiter, register);
authRouter.post('/login', strictRateLimiter, login);
authRouter.post('/refresh', strictRateLimiter, refresh);
authRouter.post('/logout', strictRateLimiter, logout);
