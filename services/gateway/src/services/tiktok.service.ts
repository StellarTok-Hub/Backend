import axios from 'axios';
import { env } from '../config';

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
 * TODO: wire up real error handling for TikTok's error envelope once client
 * credentials are provisioned.
 */
export async function exchangeCodeForToken(code: string): Promise<TikTokTokenResponse> {
  const { data } = await axios.post(TIKTOK_TOKEN_URL, {
    client_key: env.TIKTOK_CLIENT_ID,
    client_secret: env.TIKTOK_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: env.TIKTOK_REDIRECT_URI,
  });

  return data;
}

export async function fetchTikTokProfile(accessToken: string): Promise<TikTokProfile> {
  const { data } = await axios.get(TIKTOK_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { fields: 'open_id,username' },
  });

  return data.data.user;
}
