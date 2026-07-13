import { prisma } from '../src/db/prisma';
import {
  getDecryptedTikTokAccessToken,
  getIdentityForUser,
  linkTikTokIdentity,
} from '../src/services/identity.service';
import * as tiktokService from '../src/services/tiktok.service';

jest.mock('../src/db/prisma', () => ({
  prisma: {
    tikTokIdentity: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as {
  tikTokIdentity: { upsert: jest.Mock; findFirst: jest.Mock };
};

const storedIdentity = {
  id: 'identity-1',
  userId: 'user-1',
  tiktokUserId: 'open-1',
  username: 'creator',
  accessToken: 'encrypted-access',
  refreshToken: 'encrypted-refresh',
  tokenExpiresAt: new Date(Date.now() + 3600_000),
  linkedAt: new Date(),
};

describe('identity.service', () => {
  describe('linkTikTokIdentity', () => {
    it('exchanges the code, encrypts the tokens, and never returns them', async () => {
      jest.spyOn(tiktokService, 'exchangeCodeForToken').mockResolvedValue({
        access_token: 'plain-access',
        refresh_token: 'plain-refresh',
        expires_in: 3600,
        open_id: 'open-1',
      });
      jest.spyOn(tiktokService, 'fetchTikTokProfile').mockResolvedValue({
        open_id: 'open-1',
        username: 'creator',
      });
      mockedPrisma.tikTokIdentity.upsert.mockResolvedValue(storedIdentity);

      const identity = await linkTikTokIdentity('user-1', 'auth-code');

      expect(identity).not.toHaveProperty('accessToken');
      expect(identity).not.toHaveProperty('refreshToken');
      expect(identity.username).toBe('creator');

      const upsertArgs = mockedPrisma.tikTokIdentity.upsert.mock.calls[0][0];
      expect(upsertArgs.create.accessToken).not.toBe('plain-access');
      expect(upsertArgs.create.refreshToken).not.toBe('plain-refresh');
    });
  });

  describe('getIdentityForUser', () => {
    it('returns the public identity without token fields', async () => {
      mockedPrisma.tikTokIdentity.findFirst.mockResolvedValue(storedIdentity);

      const identity = await getIdentityForUser('user-1');

      expect(identity).not.toHaveProperty('accessToken');
      expect(identity).not.toHaveProperty('refreshToken');
    });

    it('throws NotFoundError when no identity is linked', async () => {
      mockedPrisma.tikTokIdentity.findFirst.mockResolvedValue(null);

      await expect(getIdentityForUser('user-1')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getDecryptedTikTokAccessToken', () => {
    it('returns the decrypted access token for a linked identity', async () => {
      const { encrypt } = jest.requireActual('../src/utils/crypto');
      mockedPrisma.tikTokIdentity.findFirst.mockResolvedValue({
        ...storedIdentity,
        accessToken: encrypt('plain-access'),
      });

      const token = await getDecryptedTikTokAccessToken('user-1');

      expect(token).toBe('plain-access');
    });

    it('throws NotFoundError when no identity is linked', async () => {
      mockedPrisma.tikTokIdentity.findFirst.mockResolvedValue(null);

      await expect(getDecryptedTikTokAccessToken('user-1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
