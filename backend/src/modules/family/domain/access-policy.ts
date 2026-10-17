import type {
  PapelFamilia,
  VisibilidadeRecurso,
} from '../../../generated/prisma/enums';

/**
 * Politica de acesso (FAM-004, RN-FAM-004). Funcoes puras e sem I/O: a decisao
 * e testada em matriz e reutilizada por qualquer modulo que acesse recursos.
 * Padrao: negar. Nunca cachear a decisao entre requisicoes (revogacao imediata).
 */

export type FamilyAction =
  | 'VER_FAMILIA'
  | 'VER_INTEGRANTES'
  | 'EDITAR_FAMILIA'
  | 'CONVIDAR'
  | 'LISTAR_CONVITES'
  | 'REVOGAR_CONVITE'
  | 'ALTERAR_PAPEL'
  | 'REMOVER_INTEGRANTE';

const ADMIN_ONLY: ReadonlySet<FamilyAction> = new Set<FamilyAction>([
  'EDITAR_FAMILIA',
  'CONVIDAR',
  'LISTAR_CONVITES',
  'REVOGAR_CONVITE',
  'ALTERAR_PAPEL',
  'REMOVER_INTEGRANTE',
]);

/** `papel` e nulo quando nao ha vinculo ATIVO na familia. */
export function canPerformFamilyAction(
  papel: PapelFamilia | null,
  action: FamilyAction,
): boolean {
  if (!papel) return false;
  if (ADMIN_ONLY.has(action)) return papel === 'ADMINISTRADOR';
  return true;
}

export type ResourceAction = 'VISUALIZAR' | 'CRIAR' | 'EDITAR' | 'EXCLUIR';

export interface ResourceGrant {
  podeVisualizar: boolean;
  podeCriar: boolean;
  podeEditar: boolean;
  podeExcluir: boolean;
}

export interface ResourceAccessInput {
  papel: PapelFamilia | null;
  isOwner: boolean;
  visibilidade: VisibilidadeRecurso;
  action: ResourceAction;
  /** Concessao ativa (nao revogada) do usuario sobre o recurso, se houver. */
  grant?: ResourceGrant | null;
}

const GRANT_FLAG: Record<ResourceAction, keyof ResourceGrant> = {
  VISUALIZAR: 'podeVisualizar',
  CRIAR: 'podeCriar',
  EDITAR: 'podeEditar',
  EXCLUIR: 'podeExcluir',
};

export type Decision = 'allow' | 'deny';

/** Precedencia da spec (secao 3): a primeira regra que casar encerra. */
export function decideResourceAccess(input: ResourceAccessInput): Decision {
  const { papel, isOwner, visibilidade, action, grant } = input;

  // Sem vinculo ativo: nega (sem revelar a existencia da familia).
  if (!papel) return 'deny';

  // RN-FAM-015: VISUALIZADOR nunca cria, edita ou exclui.
  if (papel === 'VISUALIZADOR' && action !== 'VISUALIZAR') return 'deny';

  // RN-FAM-004: privado so para o proprietario; o administrador nao tem acesso.
  if (visibilidade === 'PRIVADO') return isOwner ? 'allow' : 'deny';

  if (isOwner) return 'allow';

  const granted = grant?.[GRANT_FLAG[action]] === true;

  // Restrito: somente destinatarios listados, com a permissao da acao.
  if (visibilidade === 'RESTRITO') return granted ? 'allow' : 'deny';

  // Compartilhado: qualquer membro ativo le; as demais acoes exigem concessao
  // explicita (D-FAM-005: leitura nao implica edicao).
  if (visibilidade === 'COMPARTILHADO') {
    if (action === 'VISUALIZAR') return 'allow';
    return granted ? 'allow' : 'deny';
  }

  return 'deny';
}
