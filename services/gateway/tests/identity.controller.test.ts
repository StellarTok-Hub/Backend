import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app';
import { env } from '../src/config';
import { ACCESS_TOKEN_AUDIENCE } from '../src/middleware/auth';

function authHeaderFor(userId: string): string {
  const token = jwt.sign({ id: userId, email: 'user@example.com' }, env.JWT_SECRET, {
    audience: ACCESS_TOKEN_AUDIENCE,
  });
  return `Bearer ${token}`;
}

describe('GET /api/v1/identity/tiktok/authorize', () => {
  it('rejects requests without a bearer token', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/identity/tiktok/authorize');

    expect(res.status).toBe(401);
  });

  it('returns an authorize URL carrying a state bound to the caller', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/v1/identity/tiktok/authorize')
      .set('Authorization', authHeaderFor('user-1'));

    expect(res.status).toBe(200);
    expect(res.body.data.url).toContain('https://www.tiktok.com/v2/auth/authorize/');
    expect(res.body.data.url).toContain('state=');
  });
});
