import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';

jest.mock('../src/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock; create: jest.Mock };
  refreshToken: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
};

const testUser = { id: 'user-1', email: 'user@example.com', passwordHash: 'hashed' };

beforeEach(() => {
  mockedPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });
});

describe('POST /api/v1/auth/register', () => {
  it('rejects weak passwords', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'user@example.com', password: 'short' });

    expect(res.status).toBe(400);
  });

  it('creates a new user and returns an access + refresh token', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.user.create.mockResolvedValue(testUser);

    const app = createApp();
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'user@example.com', password: 'correct-horse-battery' });

    expect(res.status).toBe(201);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe('user@example.com');
  });

  it('rejects duplicate emails with 409', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(testUser);

    const app = createApp();
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'user@example.com', password: 'correct-horse-battery' });

    expect(res.status).toBe(409);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('rejects unknown users with 401', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'correct-horse-battery' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('rejects an unknown refresh token', async () => {
    mockedPrisma.refreshToken.findUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'not-a-real-token' });

    expect(res.status).toBe(401);
  });

  it('rotates a valid token: issues a new pair and revokes the old one', async () => {
    mockedPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-old',
      userId: testUser.id,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      user: testUser,
    });

    const app = createApp();
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'a-valid-raw-token' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
    expect(mockedPrisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-old' },
      data: { revokedAt: expect.any(Date), replacedByTokenId: 'rt-1' },
    });
  });

  it('rejects an expired token', async () => {
    mockedPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-old',
      userId: testUser.id,
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      user: testUser,
    });

    const app = createApp();
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'an-expired-token' });

    expect(res.status).toBe(401);
  });

  it('treats reuse of an already-revoked token as compromise and revokes all sessions', async () => {
    mockedPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-old',
      userId: testUser.id,
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      user: testUser,
    });

    const app = createApp();
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'a-stolen-already-used-token' });

    expect(res.status).toBe(401);
    expect(mockedPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: testUser.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('revokes the presented refresh token and returns 204', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: 'whatever-token' });

    expect(res.status).toBe(204);
    expect(mockedPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: expect.any(String), revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
