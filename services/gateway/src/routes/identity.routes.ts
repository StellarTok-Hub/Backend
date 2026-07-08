import { Router } from 'express';
import { getAuthorizeUrl, getIdentity, linkIdentity } from '../controllers/identity.controller';
import { requireAuth } from '../middleware/auth';

export const identityRouter = Router();

identityRouter.use(requireAuth);
identityRouter.get('/tiktok/authorize', getAuthorizeUrl);
identityRouter.post('/link', linkIdentity);
identityRouter.get('/', getIdentity);
