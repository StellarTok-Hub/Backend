import jwt from 'jsonwebtoken';
import { env } from '../src/config';
import { createOAuthState, verifyOAuthState } from '../src/services/oauthState.service';

describe('oauthState.service', () => {
  it('round-trips a valid state for the user it was issued to', () => {
    const state = createOAuthState('user-1');
    expect(() => verifyOAuthState(state, 'user-1')).not.toThrow();
  });

  it('rejects a state issued for a different user', () => {
    const state = createOAuthState('user-1');
    expect(() => verifyOAuthState(state, 'user-2')).toThrow();
  });

  it('rejects garbage input', () => {
    expect(() => verifyOAuthState('not-a-jwt', 'user-1')).toThrow();
  });

  it('rejects an access token presented as OAuth state', () => {
    const accessToken = jwt.sign({ id: 'user-1', email: 'a@b.com' }, env.JWT_SECRET, {
      audience: 'access',
    });

    expect(() => verifyOAuthState(accessToken, 'user-1')).toThrow();
  });

  it('rejects a state token signed with the wrong secret', () => {
    const forged = jwt.sign({ userId: 'user-1' }, 'not-the-real-secret', {
      audience: 'tiktok-oauth-state',
      expiresIn: '5m',
    });

    expect(() => verifyOAuthState(forged, 'user-1')).toThrow();
  });
});
