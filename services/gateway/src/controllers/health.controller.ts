import { Request, Response } from 'express';
import { checkDependencies } from '../services/health.service';

/** Cheap "is the process up" check — must never touch a dependency. */
export function liveness(_req: Request, res: Response) {
  res.json({ status: 'ok' });
}

/** "Can this instance actually serve traffic" — checks DB and Redis. */
export async function readiness(_req: Request, res: Response) {
  const checks = await checkDependencies();
  const healthy = Object.values(checks).every((status) => status === 'ok');

  res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'error', checks });
}
