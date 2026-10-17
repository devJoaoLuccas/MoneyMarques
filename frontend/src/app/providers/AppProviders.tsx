import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { setUnauthorizedHandler } from '../../shared/lib/http'
import { registerSessionExpiry } from './session-expiry'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))

  useEffect(() => {
    registerSessionExpiry(queryClient)
    return () => setUnauthorizedHandler(null)
  }, [queryClient])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
