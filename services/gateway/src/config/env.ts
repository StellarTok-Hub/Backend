import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  // Short-lived by design: the refresh token (see REFRESH_TOKEN_TTL_DAYS)
  // carries the actual session and can be revoked; the access token can't.
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  ENCRYPTION_KEY: z.string().refine((key) => Buffer.from(key, 'base64').length === 32, {
    message: 'ENCRYPTION_KEY must be a base64-encoded 32-byte key (e.g. `openssl rand -base64 32`)',
  }),
  TIKTOK_CLIENT_ID: z.string().default(''),
  TIKTOK_CLIENT_SECRET: z.string().default(''),
  TIKTOK_REDIRECT_URI: z.string().default(''),
  ANALYTICS_SERVICE_URL: z.string().default('http://localhost:8000'),
  // Shared secret sent as `X-Service-Auth` on every gateway -> analytics-service
  // call. analytics-service has no auth of its own otherwise reachable directly.
  SERVICE_AUTH_SECRET: z.string().min(1, 'SERVICE_AUTH_SECRET is required'),
  // Comma-separated list of origins allowed to make cross-origin browser
  // requests. Empty means no cross-origin requests are allowed.
  ALLOWED_ORIGINS: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
