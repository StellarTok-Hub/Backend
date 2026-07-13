import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app';
import { env } from '../src/config';
import { ACCESS_TOKEN_AUDIENCE } from '../src/middleware/auth';
import * as identityService from '../src/services/identity.service';
import { createOAuthState } from '../src/services/oauthState.service';

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

describe('POST /api/v1/identity/link', () => {
  it('rejects requests without a bearer token', async () => {
    const app = createApp();
    const res = await request(app).post('/api/v1/identity/link').send({ code: 'x', state: 'y' });

    expect(res.status).toBe(401);
  });

  it('rejects a state token issued for a different user', async () => {
    const app = createApp();
    const state = createOAuthState('someone-else');

    const res = await request(app)
      .post('/api/v1/identity/link')
      .set('Authorization', authHeaderFor('user-1'))
      .send({ code: 'auth-code', state });

    expect(res.status).toBe(401);
  });

  it('links the identity when the state matches the caller', async () => {
    const app = createApp();
    const state = createOAuthState('user-1');

    jest.spyOn(identityService, 'linkTikTokIdentity').mockResolvedValue({
      id: 'identity-1',
      userId: 'user-1',
      tiktokUserId: 'open-1',
      username: 'creator',
      tokenExpiresAt: new Date(),
      linkedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/v1/identity/link')
      .set('Authorization', authHeaderFor('user-1'))
      .send({ code: 'auth-code', state });

    expect(res.status).toBe(201);
    expect(res.body.data.username).toBe('creator');
  });
});
