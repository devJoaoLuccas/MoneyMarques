import { http } from '../../../shared/lib/http'
import type { CreateFamilyPayload, InvitePayload } from '../schemas/family.schemas'
import type {
  Family,
  FamilyRole,
  Invite,
  InviteCode,
  IssuedInviteCode,
  InvitePreview,
  InvitesQuery,
  Member,
  MembersQuery,
  Page,
} from '../types'

const PAGE_SIZE = 10

/** Unica porta de saida do modulo para a API de Gestao Familiar. Sem regra de negocio. */
export const familyService = {
  async create(payload: CreateFamilyPayload): Promise<Family> {
    const { nome, descricao, avatar } = payload
    const { data } = await http.post<Family>('/familias', {
      nome,
      descricao: descricao || undefined,
      avatar,
    })
    return data
  },

  async listMembers(familiaUid: string, query: MembersQuery): Promise<Page<Member>> {
    const { data } = await http.get<Page<Member>>(`/familias/${familiaUid}/integrantes`, {
      params: { ...query, tamanho: PAGE_SIZE, nome: query.nome || undefined },
    })
    return data
  },

  async changeRole(familiaUid: string, integranteUid: string, papel: FamilyRole): Promise<void> {
    await http.patch(`/familias/${familiaUid}/integrantes/${integranteUid}`, {
      papel,
      // A UI exige confirmacao explicita antes de chamar (D-FAM-004).
      confirmarPromocao: papel === 'ADMINISTRADOR' ? true : undefined,
    })
  },

  async removeMember(familiaUid: string, integranteUid: string): Promise<void> {
    await http.delete(`/familias/${familiaUid}/integrantes/${integranteUid}`)
  },

  async listInvites(familiaUid: string, query: InvitesQuery): Promise<Page<Invite>> {
    const { data } = await http.get<Page<Invite>>(`/familias/${familiaUid}/convites`, {
      params: { ...query, tamanho: PAGE_SIZE },
    })
    return data
  },

  async issueInvite(familiaUid: string, payload: InvitePayload): Promise<Invite> {
    const { data } = await http.post<Invite>(`/familias/${familiaUid}/convites`, payload)
    return data
  },

  async revokeInvite(familiaUid: string, conviteUid: string): Promise<void> {
    await http.post(`/familias/${familiaUid}/convites/${conviteUid}/revogar`)
  },

  async resendInvite(familiaUid: string, conviteUid: string): Promise<void> {
    await http.post(`/familias/${familiaUid}/convites/${conviteUid}/reenviar`)
  },

  /** O token vai no corpo, nunca na URL (nao cai em logs nem na auditoria da rota). */
  async previewInvite(token: string): Promise<InvitePreview> {
    const { data } = await http.post<InvitePreview>('/convites/previa', {
      token,
    })
    return data
  },

  async acceptInvite(token: string): Promise<{ familiaUid: string }> {
    const { data } = await http.post<{ familiaUid: string }>('/convites/aceitar', { token })
    return data
  },

  async declineInvite(token: string): Promise<void> {
    await http.post('/convites/recusar', { token })
  },

  /** Convites listados na sessao (conhecem so o uid). */
  async acceptPendingInvite(conviteUid: string): Promise<{ familiaUid: string }> {
    const { data } = await http.post<{ familiaUid: string }>(`/convites/pendentes/${conviteUid}/aceitar`)
    return data
  },

  async declinePendingInvite(conviteUid: string): Promise<void> {
    await http.post(`/convites/pendentes/${conviteUid}/recusar`)
  },

  // ─── Codigo de convite (entrada sem e-mail de destino) ─────────────────────

  async issueInviteCode(familiaUid: string, papel: Exclude<FamilyRole, 'ADMINISTRADOR'>): Promise<IssuedInviteCode> {
    const { data } = await http.post<IssuedInviteCode>(`/familias/${familiaUid}/codigos-convite`, { papel })
    return data
  },

  async listInviteCodes(familiaUid: string): Promise<InviteCode[]> {
    const { data } = await http.get<InviteCode[]>(`/familias/${familiaUid}/codigos-convite`)
    return data
  },

  /** Codigo ativo em claro (so administradores; a leitura e auditada). */
  async getActiveInviteCode(familiaUid: string): Promise<IssuedInviteCode> {
    const { data } = await http.get<IssuedInviteCode>(`/familias/${familiaUid}/codigos-convite/ativo`)
    return data
  },

  async revokeInviteCode(familiaUid: string, codigoUid: string): Promise<void> {
    await http.post(`/familias/${familiaUid}/codigos-convite/${codigoUid}/revogar`)
  },

  /** O codigo vai no corpo, nunca na URL. */
  async previewInviteCode(codigo: string): Promise<InvitePreview> {
    const { data } = await http.post<InvitePreview>('/convites/codigo/previa', { codigo })
    return data
  },

  async redeemInviteCode(codigo: string): Promise<{ familiaUid: string }> {
    const { data } = await http.post<{ familiaUid: string }>('/convites/codigo/entrar', { codigo })
    return data
  },
}
