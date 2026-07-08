import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app';
import { env } from '../src/config';
import { ACCESS_TOKEN_AUDIENCE } from '../src/middleware/auth';
import * as campaignsService from '../src/services/campaigns.service';

describe('POST /api/v1/campaigns/validate', () => {
  it('rejects requests without a bearer token', async () => {
    const app = createApp();
    const res = await request(app).post('/api/v1/campaigns/validate').send({});

    expect(res.status).toBe(401);
  });

  it('validates a well-formed request when authenticated', async () => {
    const app = createApp();
    const token = jwt.sign({ id: 'user-1', email: 'user@example.com' }, env.JWT_SECRET, {
      audience: ACCESS_TOKEN_AUDIENCE,
    });

    jest.spyOn(campaignsService, 'validateCampaign').mockResolvedValue({
      campaignId: 'camp-1',
      isValid: true,
      reasons: [],
    });

    const res = await request(app)
      .post('/api/v1/campaigns/validate')
      .set('Authorization', `Bearer ${token}`)
      .send({ campaignId: 'camp-1', brandId: 'brand-1', metrics: { views: 100 } });

    expect(res.status).toBe(200);
    expect(res.body.data.isValid).toBe(true);
  });

  it('forwards an inbound X-Request-Id to the analytics-service call and echoes it back', async () => {
    const app = createApp();
    const token = jwt.sign({ id: 'user-1', email: 'user@example.com' }, env.JWT_SECRET, {
      audience: ACCESS_TOKEN_AUDIENCE,
    });

    const spy = jest.spyOn(campaignsService, 'validateCampaign').mockResolvedValue({
      campaignId: 'camp-1',
      isValid: true,
      reasons: [],
    });

    const res = await request(app)
      .post('/api/v1/campaigns/validate')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Request-Id', 'trace-abc-123')
      .send({ campaignId: 'camp-1', brandId: 'brand-1', metrics: { views: 100 } });

    expect(res.headers['x-request-id']).toBe('trace-abc-123');
    expect(spy).toHaveBeenCalledWith(expect.anything(), 'trace-abc-123');
  });

  it('generates a request id when the client sends none', async () => {
    const app = createApp();
    const token = jwt.sign({ id: 'user-1', email: 'user@example.com' }, env.JWT_SECRET, {
      audience: ACCESS_TOKEN_AUDIENCE,
    });

    jest.spyOn(campaignsService, 'validateCampaign').mockResolvedValue({
      campaignId: 'camp-1',
      isValid: true,
      reasons: [],
    });

    const res = await request(app)
      .post('/api/v1/campaigns/validate')
      .set('Authorization', `Bearer ${token}`)
      .send({ campaignId: 'camp-1', brandId: 'brand-1', metrics: { views: 100 } });

    const requestId = res.headers['x-request-id'];
    expect(requestId).toEqual(expect.any(String));
    expect(requestId?.length).toBeGreaterThan(0);
  });
});
