import { ExecutionContext } from '@nestjs/common';
import { AuthConfig } from '../../config/auth.config';
import { authTestEnv } from '../../testing/auth-test-env';
import { CsrfGuard } from './csrf.guard';

const config = new AuthConfig(authTestEnv);

function contextFor(
  method: string,
  headers: Record<string, string> = {},
): ExecutionContext {
  const request = {
    method,
    header: (name: string) => headers[name.toLowerCase()],
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('CsrfGuard (RN-AUTH-006)', () => {
  const guard = new CsrfGuard(config);

  it('libera metodos seguros sem header', () => {
    expect(guard.canActivate(contextFor('GET'))).toBe(true);
  });

  it('rejeita POST sem o header de protecao', () => {
    expect(() => guard.canActivate(contextFor('POST'))).toThrow();
  });

  it('aceita POST com header e origem do frontend', () => {
    expect(
      guard.canActivate(
        contextFor('POST', {
          'x-csrf-protection': '1',
          origin: 'http://localhost:5173',
        }),
      ),
    ).toBe(true);
  });

  it('aceita POST com header e sem Origin (cliente nao-navegador)', () => {
    expect(
      guard.canActivate(contextFor('POST', { 'x-csrf-protection': '1' })),
    ).toBe(true);
  });

  it('rejeita Origin de terceiros mesmo com header', () => {
    expect(() =>
      guard.canActivate(
        contextFor('POST', {
          'x-csrf-protection': '1',
          origin: 'https://malicioso.example',
        }),
      ),
    ).toThrow();
  });
});
