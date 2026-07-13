import axios from 'axios';
import { exchangeCodeForToken, fetchTikTokProfile } from '../src/services/tiktok.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('tiktok.service', () => {
  describe('exchangeCodeForToken', () => {
    it('returns the token payload on a well-formed response', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'at-1',
          refresh_token: 'rt-1',
          expires_in: 3600,
          open_id: 'open-1',
        },
      });

      const result = await exchangeCodeForToken('some-code');

      expect(result.access_token).toBe('at-1');
    });

    it('throws a BadGatewayError when the request itself fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('network down'));

      await expect(exchangeCodeForToken('some-code')).rejects.toMatchObject({
        statusCode: 502,
      });
    });

    it('throws a BadGatewayError when TikTok returns a 200 with an error field', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { error: 'invalid_grant', error_description: 'code expired' },
      });

      await expect(exchangeCodeForToken('some-code')).rejects.toMatchObject({
        statusCode: 502,
      });
    });
  });

  describe('fetchTikTokProfile', () => {
    it('returns the profile on a well-formed response', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { data: { user: { open_id: 'open-1', username: 'creator' } } },
      });

      const profile = await fetchTikTokProfile('at-1');

      expect(profile).toEqual({ open_id: 'open-1', username: 'creator' });
    });

    it('throws a BadGatewayError when the request itself fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('timeout'));

      await expect(fetchTikTokProfile('at-1')).rejects.toMatchObject({ statusCode: 502 });
    });

    it('throws a BadGatewayError when the response has no user payload', async () => {
      mockedAxios.get.mockResolvedValue({ data: {} });

      await expect(fetchTikTokProfile('at-1')).rejects.toMatchObject({ statusCode: 502 });
    });
  });
});
