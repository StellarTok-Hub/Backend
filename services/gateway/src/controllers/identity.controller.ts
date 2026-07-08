import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { getIdentityForUser, linkTikTokIdentity } from '../services/identity.service';
import { createOAuthState, verifyOAuthState } from '../services/oauthState.service';
import { buildAuthorizeUrl } from '../services/tiktok.service';

const linkSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export function getAuthorizeUrl(req: Request, res: Response) {
  const state = createOAuthState(req.user!.id);
  res.json({ data: { url: buildAuthorizeUrl(state) } });
}

export async function linkIdentity(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, state } = linkSchema.parse(req.body);
    verifyOAuthState(state, req.user!.id);
    const identity = await linkTikTokIdentity(req.user!.id, code);
    res.status(201).json({ data: identity });
  } catch (err) {
    next(err);
  }
}

export async function getIdentity(req: Request, res: Response, next: NextFunction) {
  try {
    const identity = await getIdentityForUser(req.user!.id);
    res.json({ data: identity });
  } catch (err) {
    next(err);
  }
}
