/** Contratos da API de Gestao Familiar (espelham o backend). */

export type FamilyRole = 'ADMINISTRADOR' | 'INTEGRANTE' | 'VISUALIZADOR'

export interface Family {
  uid: string
  nome: string
  descricao: string | null
  avatar: string | null
  papel: FamilyRole
}

export interface Member {
  uid: string
  nome: string
  /** Completo para administradores; mascarado para os demais. */
  email: string
  papel: FamilyRole
  situacao: 'ATIVO' | 'SUSPENSO' | 'REMOVIDO'
  ingressouEm: string
  removidoEm: string | null
  voce: boolean
}

export type InviteStatus = 'PENDENTE' | 'ACEITO' | 'RECUSADO' | 'EXPIRADO' | 'REVOGADO'

export interface Invite {
  uid: string
  email: string
  papel: FamilyRole
  situacao: InviteStatus
  expiraEm: string
  criadoEm: string
  respondidoEm: string | null
}

export interface InvitePreview {
  familiaNome: string
  convidadoPorNome: string
  papelOferecido: FamilyRole
  expiraEm: string
}

export interface Page<T> {
  itens: T[]
  pagina: number
  tamanho: number
  total: number
}

export interface MembersQuery {
  pagina: number
  nome?: string
  papel?: FamilyRole
  situacao?: 'ATIVO' | 'REMOVIDO'
}

export interface InvitesQuery {
  pagina: number
  situacao?: InviteStatus
}

export type InviteCodeStatus = 'ATIVO' | 'USADO' | 'REVOGADO' | 'EXPIRADO'

export interface InviteCode {
  uid: string
  papel: FamilyRole
  situacao: InviteCodeStatus
  expiraEm: string
  criadoEm: string
  usadoEm: string | null
}

/** O codigo em claro so vem na resposta da geracao. */
export interface IssuedInviteCode extends InviteCode {
  codigo: string
}
