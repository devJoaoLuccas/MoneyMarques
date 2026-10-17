import { RateLimitRule } from '../../common/security/rate-limiter.service';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * Limites de tentativas (RN-AUTH-004). Valores iniciais definidos pelo time
 * de engenharia por falta de especificacao; ajustar apos observacao real.
 * Login combina varios sinais: par e-mail+IP (limita um atacante sem permitir
 * que ele bloqueie a vitima), e-mail isolado e IP isolado (ataques distribuidos).
 */
export const AUTH_LIMITS = {
  loginPair: { limit: 5, windowMs: 15 * MINUTE },
  loginEmail: { limit: 20, windowMs: 15 * MINUTE },
  loginIp: { limit: 30, windowMs: 15 * MINUTE },
  registerIp: { limit: 10, windowMs: HOUR },
  registerEmail: { limit: 3, windowMs: HOUR },
  forgotIp: { limit: 10, windowMs: HOUR },
  forgotEmail: { limit: 3, windowMs: HOUR },
  emailResendUser: { limit: 3, windowMs: HOUR },
  mfaUser: { limit: 5, windowMs: 5 * MINUTE },
} satisfies Record<string, RateLimitRule>;
