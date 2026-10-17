type Env = Record<string, string | undefined>;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function requireString(env: Env, key: string, minLength = 1): string {
  const value = env[key]?.trim();
  if (!value || value.length < minLength) {
    throw new Error(
      `Variavel de ambiente ${key} ausente ou invalida (minimo ${minLength} caracteres).`,
    );
  }
  return value;
}

function positiveNumber(env: Env, key: string, fallback: number): number {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Variavel de ambiente ${key} deve ser um numero positivo.`);
  }
  return value;
}

/**
 * Configuracao tipada e validada do modulo de autenticacao.
 * Falha na inicializacao quando algo obrigatorio esta ausente.
 */
export class AuthConfig {
  readonly isProduction: boolean;
  readonly frontendOrigin: string;
  readonly tokenPepper: string;
  readonly mfaEncryptionKey: Buffer;
  readonly mfaIssuer: string;
  readonly emailHmacKey: string;
  readonly emailEncryptionKey: Buffer;
  readonly sessionTtlMs: number;
  readonly rememberSessionTtlMs: number;
  readonly emailVerificationTtlMs: number;
  readonly passwordResetTtlMs: number;
  readonly familyInviteTtlMs: number;

  constructor(env: Env) {
    this.isProduction = env.NODE_ENV === 'production';
    this.frontendOrigin = new URL(requireString(env, 'FRONTEND_URL')).origin;
    this.tokenPepper = requireString(env, 'TOKEN_HASH_PEPPER', 32);

    const mfaKey = requireString(env, 'MFA_ENCRYPTION_KEY');
    if (!/^[0-9a-f]{64}$/i.test(mfaKey)) {
      throw new Error(
        'MFA_ENCRYPTION_KEY deve ter 32 bytes em hexadecimal (64 caracteres).',
      );
    }
    this.mfaEncryptionKey = Buffer.from(mfaKey, 'hex');
    this.mfaIssuer = env.MFA_ISSUER?.trim() || 'Money Marques';

    this.emailHmacKey = requireString(env, 'EMAIL_HMAC_KEY', 32);
    const emailKey = requireString(env, 'EMAIL_ENCRYPTION_KEY');
    if (!/^[0-9a-f]{64}$/i.test(emailKey)) {
      throw new Error(
        'EMAIL_ENCRYPTION_KEY deve ter 32 bytes em hexadecimal (64 caracteres).',
      );
    }
    this.emailEncryptionKey = Buffer.from(emailKey, 'hex');

    this.sessionTtlMs = positiveNumber(env, 'SESSION_TTL_HOURS', 12) * HOUR_MS;
    this.rememberSessionTtlMs =
      positiveNumber(env, 'SESSION_REMEMBER_TTL_DAYS', 30) * DAY_MS;
    this.emailVerificationTtlMs =
      positiveNumber(env, 'EMAIL_VERIFICATION_TTL_HOURS', 24) * HOUR_MS;
    this.passwordResetTtlMs =
      positiveNumber(env, 'PASSWORD_RESET_TTL_MINUTES', 30) * 60 * 1000;
    // D-FAM-002: validade padrao de 7 dias (configuravel).
    this.familyInviteTtlMs =
      positiveNumber(env, 'FAMILY_INVITE_TTL_DAYS', 7) * DAY_MS;
  }

  /** Em producao o cookie usa o prefixo __Host- (exige Secure, Path=/ e sem Domain). */
  get sessionCookieName(): string {
    return this.isProduction ? '__Host-mm_session' : 'mm_session';
  }
}
