import { createHmac } from 'node:crypto';
import { AuthConfig } from '../../../config/auth.config';
import { authTestEnv } from '../../../testing/auth-test-env';
import { EmailVaultService } from './email-vault.service';

describe('EmailVaultService (RF-013: e-mail protegido no banco)', () => {
  const vault = new EmailVaultService(new AuthConfig(authTestEnv));

  describe('hmac (identificador de busca e unicidade)', () => {
    it('e o HMAC-SHA-256 do e-mail normalizado, em hexadecimal', () => {
      const expected = createHmac('sha256', authTestEnv.EMAIL_HMAC_KEY)
        .update('ana@exemplo.com')
        .digest('hex');
      expect(vault.hmac('ana@exemplo.com')).toBe(expected);
      expect(vault.hmac('ana@exemplo.com')).toMatch(/^[0-9a-f]{64}$/);
    });

    it('ignora caixa e espacos nas pontas (mesmo identificador)', () => {
      expect(vault.hmac('  ANA@Exemplo.com ')).toBe(
        vault.hmac('ana@exemplo.com'),
      );
    });

    it('e diferente para e-mails diferentes e nao contem o e-mail', () => {
      expect(vault.hmac('ana@exemplo.com')).not.toBe(
        vault.hmac('bia@exemplo.com'),
      );
      expect(vault.hmac('ana@exemplo.com')).not.toContain('ana@exemplo.com');
    });

    it('depende da chave dedicada (outra chave gera outro valor)', () => {
      const other = new EmailVaultService(
        new AuthConfig({ ...authTestEnv, EMAIL_HMAC_KEY: 'z'.repeat(40) }),
      );
      expect(other.hmac('ana@exemplo.com')).not.toBe(
        vault.hmac('ana@exemplo.com'),
      );
    });

    it('nao reaproveita a chave dos tokens (separacao de chaves)', () => {
      const sameAsToken = createHmac('sha256', authTestEnv.TOKEN_HASH_PEPPER)
        .update('ana@exemplo.com')
        .digest('hex');
      expect(vault.hmac('ana@exemplo.com')).not.toBe(sameAsToken);
    });
  });

  describe('seal/open (copia criptografada para envio e exibicao)', () => {
    it('seal devolve o HMAC e o texto cifrado, sem o e-mail em claro', () => {
      const sealed = vault.seal(' Ana@Exemplo.com ');
      expect(sealed.emailHmac).toBe(vault.hmac('ana@exemplo.com'));
      expect(sealed.emailCriptografado).not.toContain('ana@exemplo.com');
    });

    it('open recupera o e-mail normalizado', () => {
      expect(vault.open(vault.seal('ANA@exemplo.com').emailCriptografado)).toBe(
        'ana@exemplo.com',
      );
    });

    it('open rejeita dado adulterado', () => {
      const [v, iv, tag] = vault
        .seal('ana@exemplo.com')
        .emailCriptografado.split(':');
      expect(() =>
        vault.open([v, iv, tag, Buffer.from('x').toString('base64')].join(':')),
      ).toThrow();
    });

    it('a chave de criptografia do e-mail e independente da do MFA', () => {
      const sealed = vault.seal('ana@exemplo.com');
      const swapped = new EmailVaultService(
        new AuthConfig({
          ...authTestEnv,
          EMAIL_ENCRYPTION_KEY: 'd'.repeat(64),
        }),
      );
      expect(() => swapped.open(sealed.emailCriptografado)).toThrow();
    });
  });
});
