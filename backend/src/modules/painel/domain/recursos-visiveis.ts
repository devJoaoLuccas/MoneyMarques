import type {
  PapelFamilia,
  VisibilidadeRecurso,
} from '../../../generated/prisma/enums';
import {
  decideResourceAccess,
  type ResourceGrant,
} from '../../family/domain/access-policy';

export type VisaoFinanceira = 'pessoal' | 'familiar';

export interface RecursoCandidato {
  uid: string;
  titularUid: string;
  visibilidade: VisibilidadeRecurso;
}

export interface EntradaSelecao<T extends RecursoCandidato> {
  recursos: readonly T[];
  usuarioUid: string;
  papel: PapelFamilia;
  visao: VisaoFinanceira;
  /** Concessoes ativas (nao revogadas) do usuario, por uid do recurso. */
  concessoes: ReadonlyMap<string, ResourceGrant>;
}

/**
 * Autoriza ANTES de agregar (RN-DASH-001): so o que passa daqui entra em
 * qualquer soma, grafico ou cache.
 *
 * - pessoal: apenas recursos de que o usuario e titular.
 * - familiar: apenas recursos compartilhados/autorizados. Um recurso PRIVADO
 *   do proprio usuario fica de fora (visao familiar nao expoe o que e privado),
 *   e o restante segue a politica de acesso a recursos (FAM-004).
 */
export function selecionarRecursosVisiveis<T extends RecursoCandidato>({
  recursos,
  usuarioUid,
  papel,
  visao,
  concessoes,
}: EntradaSelecao<T>): T[] {
  return recursos.filter((recurso) => {
    const isOwner = recurso.titularUid === usuarioUid;
    if (visao === 'pessoal') return isOwner;
    if (recurso.visibilidade === 'PRIVADO') return false;
    return (
      decideResourceAccess({
        papel,
        isOwner,
        visibilidade: recurso.visibilidade,
        action: 'VISUALIZAR',
        grant: concessoes.get(recurso.uid) ?? null,
      }) === 'allow'
    );
  });
}
