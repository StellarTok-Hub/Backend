import jwt from 'jsonwebtoken';
import { env } from '../config';
import { UnauthorizedError } from '../utils/appError';

// Signed with its own secret (OAUTH_STATE_SECRET) and a distinct audience, so
// a state token can never be replayed as a bearer token (and vice versa) even
// if the two secrets were ever the same, and a leak of one secret doesn't
// compromise the other token family.
const STATE_AUDIENCE = 'tiktok-oauth-state';
const STATE_TTL = '5m';

interface OAuthStatePayload {
  userId: string;
}

/**
 * Issues a short-lived, signed state value binding a TikTok OAuth handshake
 * to the authenticated user who initiated it. Protects the link flow against
 * CSRF (an attacker tricking a victim into linking the attacker's account).
 */
export function createOAuthState(userId: string): string {
  return jwt.sign({ userId } satisfies OAuthStatePayload, env.OAUTH_STATE_SECRET, {
    expiresIn: STATE_TTL,
    audience: STATE_AUDIENCE,
  });
}

export function verifyOAuthState(state: string, expectedUserId: string): void {
  let payload: OAuthStatePayload;

  try {
    payload = jwt.verify(state, env.OAUTH_STATE_SECRET, {
      audience: STATE_AUDIENCE,
    }) as OAuthStatePayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired OAuth state');
  }

  if (payload.userId !== expectedUserId) {
    throw new UnauthorizedError('OAuth state does not match the authenticated user');
  }
}
