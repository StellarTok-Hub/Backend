import { decrypt, encrypt } from '../src/utils/crypto';

describe('crypto (AES-256-GCM at-rest encryption)', () => {
  it('round-trips a plaintext value', () => {
    const ciphertext = encrypt('super-secret-tiktok-token');

    expect(ciphertext).not.toContain('super-secret-tiktok-token');
    expect(decrypt(ciphertext)).toBe('super-secret-tiktok-token');
  });

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const a = encrypt('same-input');
    const b = encrypt('same-input');

    expect(a).not.toBe(b);
  });

  it('rejects tampered ciphertext', () => {
    const ciphertext = encrypt('super-secret-tiktok-token');
    const [iv, authTag, body] = ciphertext.split('.');
    const tampered = [iv, authTag, `${body?.slice(0, -4)}AAAA`].join('.');

    expect(() => decrypt(tampered)).toThrow();
  });
});
