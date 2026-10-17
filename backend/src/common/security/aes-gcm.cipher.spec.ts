import { AesGcmCipher } from './aes-gcm.cipher';

const keyA = Buffer.alloc(32, 1);
const keyB = Buffer.alloc(32, 2);

describe('AesGcmCipher (AES-256-GCM)', () => {
  const cipher = new AesGcmCipher(keyA);

  it('descriptografa o que foi criptografado', () => {
    expect(cipher.decrypt(cipher.encrypt('JBSWY3DPEHPK3PXP'))).toBe(
      'JBSWY3DPEHPK3PXP',
    );
  });

  it('nao grava o texto puro e usa IV diferente a cada vez', () => {
    const a = cipher.encrypt('ana@exemplo.com');
    const b = cipher.encrypt('ana@exemplo.com');
    expect(a).not.toContain('ana@exemplo.com');
    expect(a).not.toBe(b);
  });

  it('rejeita payload adulterado', () => {
    const [version, iv, tag] = cipher.encrypt('segredo').split(':');
    const tampered = [
      version,
      iv,
      tag,
      Buffer.from('adulterado').toString('base64'),
    ].join(':');
    expect(() => cipher.decrypt(tampered)).toThrow();
  });

  it('rejeita formato desconhecido', () => {
    expect(() => cipher.decrypt('v9:a:b:c')).toThrow();
    expect(() => cipher.decrypt('lixo')).toThrow();
  });

  it('nao descriptografa com outra chave', () => {
    expect(() =>
      new AesGcmCipher(keyB).decrypt(cipher.encrypt('segredo')),
    ).toThrow();
  });

  it('exige chave de 32 bytes', () => {
    expect(() => new AesGcmCipher(Buffer.alloc(16))).toThrow(/32 bytes/);
  });
});
