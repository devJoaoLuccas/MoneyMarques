import type { QueryClient } from '@tanstack/react-query'
import { clearSelectedFamily, sessionQueryKey } from '../../modules/auth'
import { setUnauthorizedHandler } from '../../shared/lib/http'

/**
 * Sessao expirada no meio do uso (CA-007): descarta todo dado em cache
 * (nada financeiro fica renderizavel) e marca a sessao como ausente, o que faz
 * os guards devolverem o usuario ao login.
 */
export function handleSessionExpired(queryClient: QueryClient): void {
  clearSelectedFamily()
  queryClient.clear()
  queryClient.setQueryData(sessionQueryKey, { status: 'auth_required' })
}

export function registerSessionExpiry(queryClient: QueryClient): void {
  setUnauthorizedHandler(() => handleSessionExpired(queryClient))
}
