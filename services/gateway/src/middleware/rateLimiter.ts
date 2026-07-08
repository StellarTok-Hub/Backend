import rateLimit from 'express-rate-limit';
import { RedisStore, SendCommandFn } from 'rate-limit-redis';
import { redis } from '../redis/client';

const sendCommand: SendCommandFn = (command, ...args) =>
  redis.call(command, ...args) as ReturnType<SendCommandFn>;

function createStore(prefix: string): RedisStore {
  return new RedisStore({ sendCommand, prefix });
}

// Backed by Redis rather than the in-memory default so limits are shared
// across every gateway replica instead of being enforced per-process.
export const defaultRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('rl:default:'),
});

export const strictRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('rl:strict:'),
});
