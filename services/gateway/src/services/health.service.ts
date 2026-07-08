import { prisma } from '../db/prisma';
import { redis } from '../redis/client';

export interface DependencyChecks {
  database: 'ok' | 'error';
  redis: 'ok' | 'error';
}

export async function checkDependencies(): Promise<DependencyChecks> {
  const [database, redisStatus] = await Promise.all([checkDatabase(), checkRedis()]);
  return { database, redis: redisStatus };
}

async function checkDatabase(): Promise<'ok' | 'error'> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'ok';
  } catch {
    return 'error';
  }
}

async function checkRedis(): Promise<'ok' | 'error'> {
  try {
    await redis.ping();
    return 'ok';
  } catch {
    return 'error';
  }
}
