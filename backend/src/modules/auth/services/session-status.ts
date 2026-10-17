import { ActiveAuthStatus } from '../auth.types';

export interface SessionStatusInput {
  emailVerificado: boolean;
  mfaHabilitado: boolean;
  mfaVerificado: boolean;
}

/**
 * Regra central de acesso (RN-AUTH-009, RN-AUTH-011): dados privados so sao
 * liberados com e-mail confirmado e, quando o MFA esta ativo, com o segundo
 * fator concluido na sessao.
 */
export function deriveAuthStatus(input: SessionStatusInput): ActiveAuthStatus {
  if (!input.emailVerificado) return 'email_verification_required';
  if (input.mfaHabilitado && !input.mfaVerificado) return 'mfa_required';
  return 'authenticated';
}
