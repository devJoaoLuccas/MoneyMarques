import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const KEY_BYTES = 32;
const IV_BYTES = 12;

/**
 * Criptografia autenticada AES-256-GCM para dados sensiveis em repouso.
 * Formato: `v1:<iv>:<tag>:<dados>` (base64). IV aleatorio por mensagem.
 */
export class AesGcmCipher {
  constructor(private readonly key: Buffer) {
    if (key.length !== KEY_BYTES) {
      throw new Error(`A chave AES-256-GCM deve ter ${KEY_BYTES} bytes.`);
    }
  }

  encrypt(plain: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [
      VERSION,
      iv.toString('base64'),
      cipher.getAuthTag().toString('base64'),
      data.toString('base64'),
    ].join(':');
  }

  decrypt(payload: string): string {
    const [version, iv, tag, data] = payload.split(':');
    if (version !== VERSION || !iv || !tag || !data) {
      throw new Error('Formato de dado criptografado invalido.');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(data, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
}
