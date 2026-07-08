import { Request, Response } from 'express';
import { requireAuth } from '../src/middleware/auth';
import { createOAuthState } from '../src/services/oauthState.service';
import { UnauthorizedError } from '../src/utils/appError';

function mockReq(authorization?: string): Request {
  return { headers: { authorization } } as unknown as Request;
}

describe('requireAuth', () => {
  it('rejects an OAuth state token presented as a bearer access token', () => {
    const state = createOAuthState('user-1');
    const next = jest.fn();

    requireAuth(mockReq(`Bearer ${state}`), {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('rejects requests with no authorization header', () => {
    const next = jest.fn();

    requireAuth(mockReq(undefined), {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
