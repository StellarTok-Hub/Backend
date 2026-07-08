import { TikTokIdentity } from '@prisma/client';
import { prisma } from '../db/prisma';
import { NotFoundError } from '../utils/appError';
import { decrypt, encrypt } from '../utils/crypto';
import { exchangeCodeForToken, fetchTikTokProfile } from './tiktok.service';

type PublicIdentity = Omit<TikTokIdentity, 'accessToken' | 'refreshToken'>;

function toPublicIdentity(identity: TikTokIdentity): PublicIdentity {
  const { accessToken: _accessToken, refreshToken: _refreshToken, ...rest } = identity;
  return rest;
}

export async function linkTikTokIdentity(
  userId: string,
  authCode: string,
): Promise<PublicIdentity> {
  const token = await exchangeCodeForToken(authCode);
  const profile = await fetchTikTokProfile(token.access_token);

  const tokenExpiresAt = new Date(Date.now() + token.expires_in * 1000);
  const accessToken = encrypt(token.access_token);
  const refreshToken = encrypt(token.refresh_token);

  const identity = await prisma.tikTokIdentity.upsert({
    where: { tiktokUserId: profile.open_id },
    create: {
      userId,
      tiktokUserId: profile.open_id,
      username: profile.username,
      accessToken,
      refreshToken,
      tokenExpiresAt,
    },
    update: {
      username: profile.username,
      accessToken,
      refreshToken,
      tokenExpiresAt,
    },
  });

  return toPublicIdentity(identity);
}

export async function getIdentityForUser(userId: string): Promise<PublicIdentity> {
  const identity = await prisma.tikTokIdentity.findFirst({ where: { userId } });

  if (!identity) {
    throw new NotFoundError('No linked TikTok identity for this user');
  }

  return toPublicIdentity(identity);
}

/**
 * Decrypts and returns the caller's live TikTok access token for making
 * authenticated calls to the TikTok API on the user's behalf. Not currently
 * called from any route — reserved for when a feature needs it.
 */
export async function getDecryptedTikTokAccessToken(userId: string): Promise<string> {
  const identity = await prisma.tikTokIdentity.findFirst({ where: { userId } });

  if (!identity) {
    throw new NotFoundError('No linked TikTok identity for this user');
  }

  return decrypt(identity.accessToken);
}
