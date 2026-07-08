import { Response } from 'express';
import { ensureTipEventSubscription, tipEventBus } from '../redis/tipEventBus';
import { logger } from '../utils/logger';

/**
 * Streams tip events to one SSE-connected client by subscribing it to the
 * shared in-process tip event bus (see redis/tipEventBus.ts), which is
 * itself backed by a single shared Redis subscription for the whole process.
 */
export function streamTipEvents(res: Response): () => void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const onTip = (message: string) => {
    res.write(`data: ${message}\n\n`);
  };

  tipEventBus.on('tip', onTip);
  ensureTipEventSubscription().catch((err) => {
    logger.error({ err }, 'Tip event stream unavailable for this connection');
  });

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15_000);

  return () => {
    clearInterval(heartbeat);
    tipEventBus.off('tip', onTip);
  };
}
