import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSelectedFamily, sessionQueryKey, setSelectedFamily, useSession } from '../../auth'
import type { CreateFamilyPayload, InvitePayload } from '../schemas/family.schemas'
import { familyService } from '../services/family.service'
import type { FamilyRole, InvitesQuery, MembersQuery } from '../types'

/**
 * Chaves de cache SEMPRE prefixadas por `familiaUid` (RN-FAM-012): ao trocar
 * de contexto familiar basta remover as chaves da familia anterior.
 */
export const familyKeys = {
  scope: (familiaUid: string) => ['family', familiaUid] as const,
  members: (familiaUid: string, query?: MembersQuery) => ['family', familiaUid, 'members', query] as const,
  invites: (familiaUid: string, query?: InvitesQuery) => ['family', familiaUid, 'invites', query] as const,
}

export interface ActiveFamily {
  uid: string
  nome: string
  papel: FamilyRole
}

/**
 * Familia do contexto atual: a escolhida na selecao (AUTH-005) ou a unica do
 * usuario. Orienta a UI; o servidor valida vinculo e papel em cada requisicao.
 */
export function useActiveFamily(): ActiveFamily | null {
  const { data: session } = useSession()
  if (session?.status !== 'authenticated') return null
  const { familias } = session.contexto
  const chosen = familias.find((familia) => familia.uid === getSelectedFamily())
  const family = chosen ?? (familias.length === 1 ? familias[0] : null)
  return family ? { uid: family.uid, nome: family.nome, papel: family.papel as FamilyRole } : null
}

/** A sessao carrega o contexto familiar: apos mudar vinculos, ela e a fonte a atualizar. */
function useRefreshSession() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: sessionQueryKey })
}

/** Os mutationFn encapsulam a chamada: o TanStack Query repassa um 2o argumento que nao deve vazar. */

export function useCreateFamily() {
  const refreshSession = useRefreshSession()
  return useMutation({
    mutationFn: (payload: CreateFamilyPayload) => familyService.create(payload),
    onSuccess: async (family) => {
      setSelectedFamily(family.uid)
      await refreshSession()
    },
  })
}

export function useMembers(familiaUid: string, query: MembersQuery) {
  return useQuery({
    queryKey: familyKeys.members(familiaUid, query),
    queryFn: () => familyService.listMembers(familiaUid, query),
    placeholderData: keepPreviousData,
  })
}

export function useChangeRole(familiaUid: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ integranteUid, papel }: { integranteUid: string; papel: FamilyRole }) =>
      familyService.changeRole(familiaUid, integranteUid, papel),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: familyKeys.members(familiaUid),
      }),
  })
}

export function useRemoveMember(familiaUid: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (integranteUid: string) => familyService.removeMember(familiaUid, integranteUid),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: familyKeys.members(familiaUid),
      }),
  })
}

export function useInvites(familiaUid: string, query: InvitesQuery) {
  return useQuery({
    queryKey: familyKeys.invites(familiaUid, query),
    queryFn: () => familyService.listInvites(familiaUid, query),
    placeholderData: keepPreviousData,
  })
}

export function useIssueInvite(familiaUid: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: InvitePayload) => familyService.issueInvite(familiaUid, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: familyKeys.invites(familiaUid),
      }),
  })
}

export function useRevokeInvite(familiaUid: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conviteUid: string) => familyService.revokeInvite(familiaUid, conviteUid),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: familyKeys.invites(familiaUid),
      }),
  })
}

export function useResendInvite(familiaUid: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conviteUid: string) => familyService.resendInvite(familiaUid, conviteUid),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: familyKeys.invites(familiaUid),
      }),
  })
}

/** Previa do convite pelo link do e-mail (sem dados financeiros). */
export function useInvitePreview(token: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['family', 'invite-preview', token] as const,
    queryFn: () => familyService.previewInvite(token as string),
    enabled: enabled && token !== null,
    retry: false,
    staleTime: Infinity,
  })
}

export function useAcceptInvite() {
  const refreshSession = useRefreshSession()
  return useMutation({
    mutationFn: (token: string) => familyService.acceptInvite(token),
    onSuccess: async ({ familiaUid }) => {
      setSelectedFamily(familiaUid)
      await refreshSession()
    },
  })
}

export function useDeclineInvite() {
  const refreshSession = useRefreshSession()
  return useMutation({
    mutationFn: (token: string) => familyService.declineInvite(token),
    onSuccess: refreshSession,
  })
}

export function useAcceptPendingInvite() {
  const refreshSession = useRefreshSession()
  return useMutation({
    mutationFn: (conviteUid: string) => familyService.acceptPendingInvite(conviteUid),
    onSuccess: async ({ familiaUid }) => {
      setSelectedFamily(familiaUid)
      await refreshSession()
    },
  })
}

export function useDeclinePendingInvite() {
  const refreshSession = useRefreshSession()
  return useMutation({
    mutationFn: (conviteUid: string) => familyService.declinePendingInvite(conviteUid),
    onSuccess: refreshSession,
  })
}
