import Redis from 'ioredis';
import { env } from '../config';

export const TIP_EVENTS_CHANNEL = 'tips:events';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// Separate connection for pub/sub subscriptions, per ioredis convention
// (a subscribed connection cannot issue other commands).
export function createSubscriber(): Redis {
  return new Redis(env.REDIS_URL, { lazyConnect: true });
}
