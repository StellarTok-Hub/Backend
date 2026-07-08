import { Request, Response } from 'express';
import { streamTipEvents } from '../services/tips.service';

export function streamTips(req: Request, res: Response) {
  const close = streamTipEvents(res);
  req.on('close', close);
}
