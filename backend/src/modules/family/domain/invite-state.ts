import type { SituacaoConvite } from '../../../generated/prisma/enums';

export type InviteStatus = SituacaoConvite;

const FROM_PENDING: ReadonlySet<InviteStatus> = new Set<InviteStatus>([
  'ACEITO',
  'RECUSADO',
  'EXPIRADO',
  'REVOGADO',
]);

/** Somente PENDENTE transita; todos os demais estados sao finais. */
export function canTransitionInvite(
  from: InviteStatus,
  to: InviteStatus,
): boolean {
  return from === 'PENDENTE' && FROM_PENDING.has(to);
}
