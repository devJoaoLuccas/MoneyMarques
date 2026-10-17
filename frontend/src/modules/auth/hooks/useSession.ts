import { useQuery } from '@tanstack/react-query'
import { authService } from '../services/auth.service'

export const sessionQueryKey = ['auth', 'session'] as const

/** Estado da sessao no servidor (fonte unica para guards e telas). */
export function useSession() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: authService.getSession,
    staleTime: 60_000,
    retry: false,
  })
}
