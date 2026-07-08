import { redis } from '../src/redis/client';

afterAll(async () => {
  await redis.quit();
});
