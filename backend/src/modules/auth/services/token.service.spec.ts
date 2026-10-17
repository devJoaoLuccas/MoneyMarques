import { AuthConfig } from '../../../config/auth.config';
import { authTestEnv } from '../../../testing/auth-test-env';
import { TokenService } from './token.service';

const makeConfig = (pepper: string) =>
  new AuthConfig({ ...authTestEnv, TOKEN_HASH_PEPPER: pepper });

describe('TokenService (RN-AUTH-003, RN-AUTH-010)', () => {
  const service = new TokenService(makeConfig('p'.repeat(40)));

  it('gera tokens unicos e longos', () => {
    const a = service.generateToken();
    const b = service.generateToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
  });

  it('hash e deterministico e nao contem o valor original', () => {
    const token = service.generateToken();
    expect(service.hash(token)).toBe(service.hash(token));
    expect(service.hash(token)).not.toContain(token);
    expect(service.hash(token)).toHaveLength(64);
  });

  it('hash depende do pepper', () => {
    const other = new TokenService(makeConfig('q'.repeat(40)));
    expect(other.hash('x')).not.toBe(service.hash('x'));
  });

  it('codigo de recuperacao tem formato XXXXX-XXXXX sem caracteres ambiguos', () => {
    const code = service.generateRecoveryCode();
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{5}-[A-HJKMNP-Z2-9]{5}$/);
  });

  it('hash do codigo de recuperacao ignora caixa, espacos e hifen', () => {
    expect(service.hashRecoveryCode('abcde-fgh23')).toBe(
      service.hashRecoveryCode(' ABCDE FGH23 '),
    );
  });

  it('safeEquals compara em tempo constante e rejeita tamanhos diferentes', () => {
    expect(service.safeEquals('abc', 'abc')).toBe(true);
    expect(service.safeEquals('abc', 'abd')).toBe(false);
    expect(service.safeEquals('abc', 'abcd')).toBe(false);
  });
});
