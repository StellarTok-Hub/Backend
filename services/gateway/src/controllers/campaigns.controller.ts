import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { validateCampaign } from '../services/campaigns.service';

const validateSchema = z.object({
  campaignId: z.string().min(1),
  brandId: z.string().min(1),
  metrics: z.record(z.number()),
});

export async function validate(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = validateSchema.parse(req.body);
    const result = await validateCampaign(payload, String(req.id));
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
