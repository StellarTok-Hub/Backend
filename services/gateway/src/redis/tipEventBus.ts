import { EventEmitter } from 'events';
import { createSubscriber, TIP_EVENTS_CHANNEL } from './client';
import { logger } from '../utils/logger';

/**
 * Fans a single shared Redis subscription out to any number of connected
 * SSE clients via an in-process EventEmitter. Previously each client opened
 * its own Redis subscriber connection, which exhausts Redis connections
 * under real concurrent viewership — this keeps it at exactly one
 * connection per gateway process regardless of client count.
 */
export const tipEventBus = new EventEmitter();
tipEventBus.setMaxListeners(0);

const subscriber = createSubscriber();
let subscribePromise: Promise<void> | null = null;

export function ensureTipEventSubscription(): Promise<void> {
  if (!subscribePromise) {
    subscriber.on('message', (_channel, message) => {
      tipEventBus.emit('tip', message);
    });

    subscribePromise = subscriber.subscribe(TIP_EVENTS_CHANNEL).then(
      () => undefined,
      (err) => {
        subscribePromise = null;
        logger.error({ err }, 'Failed to subscribe to tip events channel');
        throw err;
      },
    );
  }

  return subscribePromise;
}
