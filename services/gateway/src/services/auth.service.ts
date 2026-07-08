import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config';
import { prisma } from '../db/prisma';
import { ACCESS_TOKEN_AUDIENCE, AuthenticatedUser } from '../middleware/auth';
import { ConflictError, UnauthorizedError } from '../utils/appError';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_BYTES = 64;
const REFRESH_TOKEN_TTL_MS = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

export interface AuthResult {
  token: string;
  refreshToken: string;
  user: { id: string; email: string };
}

function signAccessToken(payload: AuthenticatedUser): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    audience: ACCESS_TOKEN_AUDIENCE,
  });
}

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

async function createRefreshToken(userId: string): Promise<{ rawToken: string; id: string }> {
  const rawToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');

  const created = await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return { rawToken, id: created.id };
}

async function buildAuthResult(user: {
  id: string;
  email: string;
}): Promise<AuthResult & { refreshTokenId: string }> {
  const token = signAccessToken({ id: user.id, email: user.email });
  const { rawToken, id } = await createRefreshToken(user.id);

  return {
    token,
    refreshToken: rawToken,
    refreshTokenId: id,
    user: { id: user.id, email: user.email },
  };
}

export async function registerUser(email: string, password: string): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({ data: { email, passwordHash } });

  const { refreshTokenId: _refreshTokenId, ...result } = await buildAuthResult(user);
  return result;
}

export async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const { refreshTokenId: _refreshTokenId, ...result } = await buildAuthResult(user);
  return result;
}

/**
 * Validates a refresh token and rotates it: the presented token is revoked
 * and a new access/refresh pair is issued in its place. If a token that was
 * already revoked is presented again — the signature of a stolen token being
 * replayed after the legitimate owner (or the thief) already rotated past it
 * — every outstanding refresh token for that user is revoked so neither side
 * can continue the compromised session.
 */
export async function refreshSession(rawRefreshToken: string): Promise<AuthResult> {
  const tokenHash = hashToken(rawRefreshToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError('Refresh token reuse detected; all sessions revoked');
  }

  if (stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token has expired');
  }

  const { refreshTokenId, ...result } = await buildAuthResult(stored.user);

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date(), replacedByTokenId: refreshTokenId },
  });

  return result;
}

/** Idempotent: logout should succeed even if the token is unknown or already revoked. */
export async function revokeRefreshToken(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);

  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
