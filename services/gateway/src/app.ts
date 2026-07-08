import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import { env } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { defaultRateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { apiRouter } from './routes';

const allowedOrigins = env.ALLOWED_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  // No origins configured -> deny all cross-origin browser requests by
  // default rather than falling back to a permissive wildcard.
  app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : false }));
  app.use(express.json());
  app.use(requestLogger);
  app.use(defaultRateLimiter);

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
