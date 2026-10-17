import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from '../../modules/auth/services/auth.service'
import type { SessionView } from '../../modules/auth/types'
import { createTestQueryClient } from '../../test/render'
import { appRoutes } from './app-routes'

vi.mock('../../modules/auth/services/auth.service', () => ({
  authService: { getSession: vi.fn(), logout: vi.fn() },
}))

const authenticated: SessionView = {
  status: 'authenticated',
  usuario: { uid: 'u1', nomeCompleto: 'Ana Maria', email: 'ana@exemplo.com' },
  mfaHabilitado: false,
  contexto: { tipo: 'unico', familias: [{ uid: 'f1', nome: 'Silva', papel: 'ADMINISTRADOR' }], convitesPendentes: [] },
}

function renderApp(route: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [route] })
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('rotas da aplicacao (composicao dos modulos)', () => {
  beforeEach(() => {
    vi.mocked(authService.getSession).mockReset()
  })

  it('visitante na raiz cai na tela de login (AUTH-001)', async () => {
    vi.mocked(authService.getSession).mockResolvedValue({ status: 'auth_required' })
    const router = renderApp('/')
    expect(await screen.findByRole('heading', { level: 1, name: /entre na sua conta/i })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('expoe as telas publicas de cadastro e recuperacao (AUTH-002, AUTH-003)', async () => {
    vi.mocked(authService.getSession).mockResolvedValue({ status: 'auth_required' })
    renderApp('/cadastro')
    expect(await screen.findByRole('heading', { level: 1, name: /criar conta/i })).toBeInTheDocument()
  })

  it('a pagina de recuperacao de senha existe', async () => {
    vi.mocked(authService.getSession).mockResolvedValue({ status: 'auth_required' })
    renderApp('/esqueci-senha')
    expect(await screen.findByRole('heading', { level: 1, name: /recuperar senha/i })).toBeInTheDocument()
  })

  it('a redefinicao de senha e publica (acessada pelo link do e-mail)', async () => {
    vi.mocked(authService.getSession).mockResolvedValue({ status: 'auth_required' })
    renderApp('/redefinir-senha#token=abc')
    expect(await screen.findByLabelText('Nova senha')).toBeInTheDocument()
  })

  it('rota privada sem sessao exige login', async () => {
    vi.mocked(authService.getSession).mockResolvedValue({ status: 'auth_required' })
    const router = renderApp('/app')
    expect(await screen.findByRole('heading', { level: 1, name: /entre na sua conta/i })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('usuario autenticado com familia chega a area do app', async () => {
    vi.mocked(authService.getSession).mockResolvedValue(authenticated)
    const router = renderApp('/')
    expect(await screen.findByRole('heading', { level: 1, name: /olá, ana/i })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/app')
  })

  it('a verificacao MFA so abre com MFA pendente', async () => {
    vi.mocked(authService.getSession).mockResolvedValue({
      status: 'mfa_required',
      usuario: { email: 'a@b.com' },
      mfaHabilitado: true,
    })
    renderApp('/verificacao-mfa')
    expect(await screen.findByLabelText('Código de verificação')).toBeInTheDocument()
  })

  it('rota inexistente mostra pagina de nao encontrado', async () => {
    vi.mocked(authService.getSession).mockResolvedValue({ status: 'auth_required' })
    renderApp('/nao-existe')
    expect(await screen.findByRole('heading', { level: 1, name: /página não encontrada/i })).toBeInTheDocument()
  })
})
