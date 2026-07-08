import { Router } from 'express';
import { authRouter } from './auth.routes';
import { campaignsRouter } from './campaigns.routes';
import { identityRouter } from './identity.routes';
import { tipsRouter } from './tips.routes';
import { liveness, readiness } from '../controllers/health.controller';

export const apiRouter = Router();

apiRouter.get('/health', liveness);
apiRouter.get('/health/ready', readiness);
apiRouter.use('/auth', authRouter);
apiRouter.use('/identity', identityRouter);
apiRouter.use('/tips', tipsRouter);
apiRouter.use('/campaigns', campaignsRouter);
