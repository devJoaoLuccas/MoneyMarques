import { RateLimitRule } from '../../common/security/rate-limiter.service';

/** Avatares predefinidos (D-FAM-008): sem upload no MVP. O valor e gravado em `familia.avatar_url`. */
export const FAMILY_AVATARS = ['casa', 'casal', 'familia'] as const;

export type FamilyAvatar = (typeof FAMILY_AVATARS)[number];

export const FAMILY_NAME_MIN = 3;
export const FAMILY_NAME_MAX = 40;
export const FAMILY_DESCRIPTION_MAX = 240;

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 50;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * Limites de emissao/reenvio de convites e de respostas por token (FAM-005).
 * Valores iniciais definidos pela engenharia por falta de especificacao.
 */
export const FAMILY_LIMITS = {
  invitePerAdmin: { limit: 20, windowMs: HOUR },
  invitePerFamily: { limit: 50, windowMs: 24 * HOUR },
  inviteResponsePerUser: { limit: 20, windowMs: 15 * MINUTE },
  /** Tentativas ERRADAS de codigo por usuario (protege contra adivinhacao). */
  inviteCodeFailuresPerUser: { limit: 5, windowMs: 15 * MINUTE },
} satisfies Record<string, RateLimitRule>;

/** Validade do codigo de convite (D-FAM-009): curta, para uso imediato. */
export const INVITE_CODE_TTL_MS = 24 * HOUR;
