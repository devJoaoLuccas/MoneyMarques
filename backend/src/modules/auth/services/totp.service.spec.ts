import { base32Decode, base32Encode, TotpService } from './totp.service';

// Vetores de teste da RFC 6238 (apendice B), segredo ASCII "12345678901234567890".
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

describe('TotpService (AUTH-004, CA-018)', () => {
  const service = new TotpService();

  describe.each([
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
  ])('vetor RFC 6238 em t=%i', (time, expected8) => {
    it('gera o codigo esperado', () => {
      const step = service.stepAt(time * 1000);
      expect(service.codeForStep(RFC_SECRET, step, 8)).toBe(expected8);
      expect(service.codeForStep(RFC_SECRET, step)).toBe(expected8.slice(-6));
    });
  });

  it('base32 faz o caminho de ida e volta', () => {
    const raw = Buffer.from('segredo-totp-123');
    expect(base32Decode(base32Encode(raw)).equals(raw)).toBe(true);
  });

  it('base32Decode rejeita caracteres invalidos', () => {
    expect(() => base32Decode('abc1!')).toThrow();
  });

  it('aceita o codigo atual e informa o passo', () => {
    const now = 1_700_000_000_000;
    const step = service.stepAt(now);
    const code = service.codeForStep(RFC_SECRET, step);
    expect(service.verify(RFC_SECRET, code, now)).toEqual({
      valid: true,
      step,
    });
  });

  it('tolera um passo de diferenca de relogio, mas nao dois', () => {
    const now = 1_700_000_000_000;
    const step = service.stepAt(now);
    const previous = service.codeForStep(RFC_SECRET, step - 1);
    const old = service.codeForStep(RFC_SECRET, step - 2);
    expect(service.verify(RFC_SECRET, previous, now).valid).toBe(true);
    expect(service.verify(RFC_SECRET, old, now).valid).toBe(false);
  });

  it('rejeita formato invalido', () => {
    expect(service.verify(RFC_SECRET, '12345').valid).toBe(false);
    expect(service.verify(RFC_SECRET, 'abcdef').valid).toBe(false);
  });

  it('gera segredos base32 distintos de 160 bits', () => {
    const a = service.generateSecret();
    expect(a).toMatch(/^[A-Z2-7]{32}$/);
    expect(service.generateSecret()).not.toBe(a);
  });

  it('monta a URI otpauth com issuer e conta', () => {
    const uri = service.buildOtpauthUri({
      secret: 'ABC',
      accountName: 'ana@exemplo.com',
      issuer: 'Money Marques',
    });
    expect(uri).toContain('otpauth://totp/Money%20Marques%3Aana%40exemplo.com');
    expect(uri).toContain('secret=ABC');
    expect(uri).toContain('digits=6');
  });
});
