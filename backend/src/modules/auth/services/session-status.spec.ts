import { deriveAuthStatus } from './session-status';

describe('deriveAuthStatus (CA-017, RN-AUTH-009, RN-AUTH-011)', () => {
  it('exige e-mail confirmado antes de qualquer outra coisa', () => {
    expect(
      deriveAuthStatus({
        emailVerificado: false,
        mfaHabilitado: true,
        mfaVerificado: true,
      }),
    ).toBe('email_verification_required');
  });

  it('MFA ativo e nao verificado deixa a sessao pendente', () => {
    expect(
      deriveAuthStatus({
        emailVerificado: true,
        mfaHabilitado: true,
        mfaVerificado: false,
      }),
    ).toBe('mfa_required');
  });

  it('MFA ativo e verificado libera o acesso', () => {
    expect(
      deriveAuthStatus({
        emailVerificado: true,
        mfaHabilitado: true,
        mfaVerificado: true,
      }),
    ).toBe('authenticated');
  });

  it('sem MFA ativo, e-mail confirmado basta', () => {
    expect(
      deriveAuthStatus({
        emailVerificado: true,
        mfaHabilitado: false,
        mfaVerificado: false,
      }),
    ).toBe('authenticated');
  });
});
