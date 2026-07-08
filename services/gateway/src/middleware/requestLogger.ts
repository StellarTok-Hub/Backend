import { randomUUID } from 'crypto';
import { IncomingMessage, ServerResponse } from 'http';
import pinoHttp from 'pino-http';
import { logger } from '../utils/logger';

export const REQUEST_ID_HEADER = 'x-request-id';

// Honors an inbound X-Request-Id (e.g. from an upstream proxy) so a request
// can be traced across services; otherwise mints a fresh one. Always echoed
// back as a response header regardless of origin.
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req: IncomingMessage, res: ServerResponse) => {
    const existing = req.headers[REQUEST_ID_HEADER];
    const id = (Array.isArray(existing) ? existing[0] : existing) || randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
});
