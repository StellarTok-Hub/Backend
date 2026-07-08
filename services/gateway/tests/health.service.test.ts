jest.mock('../src/db/prisma', () => ({
  prisma: { $queryRaw: jest.fn() },
}));

jest.mock('../src/redis/client', () => ({
  redis: { ping: jest.fn() },
  createSubscriber: jest.fn(),
  TIP_EVENTS_CHANNEL: 'tips:events',
}));

import { prisma } from '../src/db/prisma';
import { redis } from '../src/redis/client';
import { checkDependencies } from '../src/services/health.service';

const mockedPrisma = prisma as unknown as { $queryRaw: jest.Mock };
const mockedRedis = redis as unknown as { ping: jest.Mock };

describe('checkDependencies', () => {
  it('reports ok when both the database and redis respond', async () => {
    mockedPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    mockedRedis.ping.mockResolvedValue('PONG');

    expect(await checkDependencies()).toEqual({ database: 'ok', redis: 'ok' });
  });

  it('reports each dependency independently when only one fails', async () => {
    mockedPrisma.$queryRaw.mockRejectedValue(new Error('connection refused'));
    mockedRedis.ping.mockResolvedValue('PONG');

    expect(await checkDependencies()).toEqual({ database: 'error', redis: 'ok' });
  });

  it('reports redis failure independently of database health', async () => {
    mockedPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    mockedRedis.ping.mockRejectedValue(new Error('ECONNREFUSED'));

    expect(await checkDependencies()).toEqual({ database: 'ok', redis: 'error' });
  });
});
