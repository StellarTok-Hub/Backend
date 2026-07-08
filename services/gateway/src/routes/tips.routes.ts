import { Router } from 'express';
import { streamTips } from '../controllers/tips.controller';
import { requireAuth } from '../middleware/auth';

export const tipsRouter = Router();

tipsRouter.get('/stream', requireAuth, streamTips);
