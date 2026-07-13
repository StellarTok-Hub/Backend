import axios from 'axios';
import { env } from '../config';
import { BadGatewayError } from '../utils/appError';
import { logger } from '../utils/logger';

export interface TikTokTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  open_id: string;
}

export interface TikTokProfile {
  open_id: string;
  username: string;
}

const TIKTOK_AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_USERINFO_URL = 'https://open.tiktokapis.com/v2/user/info/';

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_key: env.TIKTOK_CLIENT_ID,
    scope: 'user.info.basic',
    response_type: 'code',
    redirect_uri: env.TIKTOK_REDIRECT_URI,
    state,
  });

  return `${TIKTOK_AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Exchanges an OAuth authorization code for TikTok access/refresh tokens.
 * TikTok reports failures (expired code, bad client credentials, ...) as a
 * 200 with an `error` field or as a non-2xx with its own error envelope
 * rather than a consistent typed error, so both are normalized to a single
 * BadGatewayError here instead of leaking TikTok's response shape to callers.
 */
export async function exchangeCodeForToken(code: string): Promise<TikTokTokenResponse> {
  let data: TikTokTokenResponse & { error?: string; error_description?: string };

  try {
    const response = await axios.post(TIKTOK_TOKEN_URL, {
      client_key: env.TIKTOK_CLIENT_ID,
      client_secret: env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: env.TIKTOK_REDIRECT_URI,
    });
    data = response.data;
  } catch (err) {
    logger.error({ err }, 'TikTok token exchange request failed');
    throw new BadGatewayError('Failed to exchange TikTok authorization code');
  }

  if (data.error || !data.access_token) {
    logger.error(
      { tiktokError: data.error, description: data.error_description },
      'TikTok rejected the token exchange',
    );
    throw new BadGatewayError('TikTok rejected the authorization code');
  }

  return data;
}

export async function fetchTikTokProfile(accessToken: string): Promise<TikTokProfile> {
  let user: TikTokProfile | undefined;

  try {
    const { data } = await axios.get(TIKTOK_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { fields: 'open_id,username' },
    });
    user = data?.data?.user;
  } catch (err) {
    logger.error({ err }, 'TikTok profile fetch request failed');
    throw new BadGatewayError('Failed to fetch TikTok profile');
  }

  if (!user) {
    throw new BadGatewayError('TikTok returned an unexpected profile response');
  }

  return user;
}
