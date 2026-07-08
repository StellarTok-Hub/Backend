import request from 'supertest';
import { createApp } from '../src/app';
import * as healthService from '../src/services/health.service';

describe('GET /api/v1/health', () => {
  it('returns ok status without touching any dependency', async () => {
    const spy = jest.spyOn(healthService, 'checkDependencies');
    const app = createApp();
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/health/ready', () => {
  it('returns 200 when all dependencies are reachable', async () => {
    jest.spyOn(healthService, 'checkDependencies').mockResolvedValue({
      database: 'ok',
      redis: 'ok',
    });

    const app = createApp();
    const res = await request(app).get('/api/v1/health/ready');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', checks: { database: 'ok', redis: 'ok' } });
  });

  it('returns 503 when a dependency is unreachable', async () => {
    jest.spyOn(healthService, 'checkDependencies').mockResolvedValue({
      database: 'error',
      redis: 'ok',
    });

    const app = createApp();
    const res = await request(app).get('/api/v1/health/ready');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
  });
});
