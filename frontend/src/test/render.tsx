import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { LocationProbe } from './LocationProbe'

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
}

interface RenderOptions {
  route?: string
  client?: QueryClient
}

/** Renderiza com React Query + Router em memoria (sem rede, sem navegador). */
export function renderWithProviders(ui: ReactElement, { route = '/', client }: RenderOptions = {}) {
  const queryClient = client ?? createTestQueryClient()
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...utils, queryClient }
}
