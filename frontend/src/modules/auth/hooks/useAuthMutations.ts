import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MfaFormValues, RegisterFormValues } from '../schemas/auth.schemas'
import { authService } from '../services/auth.service'
import { clearSelectedFamily } from '../state/selected-family'
import type { LoginPayload, SessionView } from '../types'
import { sessionQueryKey } from './useSession'

const NO_SESSION: SessionView = { status: 'auth_required' }

/**
 * Os mutationFn encapsulam a chamada: o TanStack Query repassa um 2o argumento
 * (contexto) que nao deve vazar para o servico.
 */

/** Login: ao concluir, a resposta ja e o novo estado da sessao. */
export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (session) => queryClient.setQueryData(sessionQueryKey, session),
  })
}

export function useVerifyMfa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: MfaFormValues) => authService.verifyMfa(values),
    onSuccess: (session) => queryClient.setQueryData(sessionQueryKey, session),
  })
}

/** Logout: descarta todo dado em cache (nada financeiro permanece na memoria). */
export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      clearSelectedFamily()
      queryClient.clear()
      queryClient.setQueryData(sessionQueryKey, NO_SESSION)
    },
  })
}

export function useRegister() {
  return useMutation({ mutationFn: (values: RegisterFormValues) => authService.register(values) })
}

export function useForgotPassword() {
  return useMutation({ mutationFn: (email: string) => authService.forgotPassword(email) })
}

/** A redefinicao revoga todas as sessoes no servidor: o cache local acompanha. */
export function useResetPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ token, senha }: { token: string; senha: string }) => authService.resetPassword(token, senha),
    onSuccess: () => queryClient.setQueryData(sessionQueryKey, NO_SESSION),
  })
}

export function useVerifyEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => authService.verifyEmail(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
  })
}

export function useResendVerification() {
  return useMutation({ mutationFn: () => authService.resendVerification() })
}
