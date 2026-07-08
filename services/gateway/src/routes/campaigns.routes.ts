import { Router } from 'express';
import { validate } from '../controllers/campaigns.controller';
import { requireAuth } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';

export const campaignsRouter = Router();

campaignsRouter.post('/validate', requireAuth, strictRateLimiter, validate);
