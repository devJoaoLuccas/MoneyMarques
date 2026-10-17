import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/render'
import { authService } from '../services/auth.service'
import { setSelectedFamily } from '../state/selected-family'
import type { FamilyContextType, SessionView } from '../types'
import { GuestOnly } from './GuestOnly'
import { RequireAuth } from './RequireAuth'
import { RequireFamilyContext } from './RequireFamilyContext'
import { RequireSessionStatus } from './RequireSessionStatus'

vi.mock('../services/auth.service', () => ({ authService: { getSession: vi.fn() } }))

const familia = (uid: string) => ({ uid, nome: `Familia ${uid}`, papel: 'INTEGRANTE' })

function authenticated(tipo: FamilyContextType, familias = [familia('f1')]): SessionView {
  return {
    status: 'authenticated',
    usuario: { uid: 'u1', nomeCompleto: 'Ana', email: 'ana@exemplo.com' },
    mfaHabilitado: false,
    contexto: { tipo, familias: tipo === 'sem_familia' ? [] : familias, convitesPendentes: [] },
  }
}

const mfaRequired: SessionView = { status: 'mfa_required', usuario: { email: 'a@b.com' }, mfaHabilitado: true }
const emailPending: SessionView = {
  status: 'email_verification_required',
  usuario: { email: 'a@b.com' },
  mfaHabilitado: false,
}

function mockSession(view: SessionView) {
  vi.mocked(authService.getSession).mockResolvedValue(view)
}

function Tree() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<p>tela de login</p>} />
      </Route>
      <Route element={<RequireSessionStatus status="mfa_required" />}>
        <Route path="/verificacao-mfa" element={<p>tela de mfa</p>} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path="/contexto" element={<p>tela de contexto</p>} />
        <Route path="/familia/nova" element={<p>onboarding familiar</p>} />
        <Route element={<RequireFamilyContext />}>
          <Route path="/app" element={<p>area privada</p>} />
        </Route>
      </Route>
      <Route path="/verificar-email" element={<p>tela de e-mail pendente</p>} />
    </Routes>
  )
}

describe('guards de rota (RN-AUTH-008, CA-007, CA-017)', () => {
  beforeEach(() => {
    vi.mocked(authService.getSession).mockReset()
    window.sessionStorage.clear()
  })

  describe('RequireAuth', () => {
    it('mostra carregamento acessivel enquanto verifica a sessao', () => {
      vi.mocked(authService.getSession).mockReturnValue(new Promise(() => {}))
      renderWithProviders(<Tree />, { route: '/app' })
      expect(screen.getByRole('status')).toHaveTextContent(/verificando sessão/i)
      expect(screen.queryByText('area privada')).not.toBeInTheDocument()
    })

    it('acesso direto a rota privada sem sessao vai para o login', async () => {
      mockSession({ status: 'auth_required' })
      renderWithProviders(<Tree />, { route: '/app' })
      expect(await screen.findByText('tela de login')).toBeInTheDocument()
      expect(screen.getByTestId('location')).toHaveTextContent('/login')
    })

    it('CA-017: com MFA pendente nao acessa rotas privadas', async () => {
      mockSession(mfaRequired)
      renderWithProviders(<Tree />, { route: '/app' })
      expect(await screen.findByText('tela de mfa')).toBeInTheDocument()
      expect(screen.queryByText('area privada')).not.toBeInTheDocument()
    })

    it('com e-mail nao confirmado nao acessa rotas privadas', async () => {
      mockSession(emailPending)
      renderWithProviders(<Tree />, { route: '/app' })
      expect(await screen.findByText('tela de e-mail pendente')).toBeInTheDocument()
    })

    it('sessao autenticada com familia unica renderiza a rota privada', async () => {
      mockSession(authenticated('unico'))
      renderWithProviders(<Tree />, { route: '/app' })
      expect(await screen.findByText('area privada')).toBeInTheDocument()
    })

    it('falha ao consultar a sessao mostra erro com nova tentativa (sem expor conteudo)', async () => {
      vi.mocked(authService.getSession).mockRejectedValueOnce(new Error('rede'))
      renderWithProviders(<Tree />, { route: '/app' })
      expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível verificar sua sessão/i)

      mockSession(authenticated('unico'))
      await userEvent.setup().click(screen.getByRole('button', { name: /tentar novamente/i }))
      expect(await screen.findByText('area privada')).toBeInTheDocument()
    })
  })

  describe('RequireFamilyContext (AUTH-005)', () => {
    it('sem familia: onboarding familiar', async () => {
      mockSession(authenticated('sem_familia'))
      renderWithProviders(<Tree />, { route: '/app' })
      expect(await screen.findByText('onboarding familiar')).toBeInTheDocument()
    })

    it('varias familias sem escolha: abre a selecao de contexto', async () => {
      mockSession(authenticated('multiplo', [familia('f1'), familia('f2')]))
      renderWithProviders(<Tree />, { route: '/app' })
      expect(await screen.findByText('tela de contexto')).toBeInTheDocument()
    })

    it('varias familias com escolha valida: entra na area privada', async () => {
      setSelectedFamily('f2')
      mockSession(authenticated('multiplo', [familia('f1'), familia('f2')]))
      renderWithProviders(<Tree />, { route: '/app' })
      expect(await screen.findByText('area privada')).toBeInTheDocument()
    })

    it('escolha de familia alheia e ignorada', async () => {
      setSelectedFamily('familia-alheia')
      mockSession(authenticated('multiplo', [familia('f1'), familia('f2')]))
      renderWithProviders(<Tree />, { route: '/app' })
      expect(await screen.findByText('tela de contexto')).toBeInTheDocument()
    })
  })

  describe('GuestOnly', () => {
    it('visitante ve a tela publica', async () => {
      mockSession({ status: 'auth_required' })
      renderWithProviders(<Tree />, { route: '/login' })
      expect(await screen.findByText('tela de login')).toBeInTheDocument()
    })

    it('usuario com sessao valida acessando /login e redirecionado ao contexto autorizado', async () => {
      mockSession(authenticated('unico'))
      renderWithProviders(<Tree />, { route: '/login' })
      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/app'))
      expect(await screen.findByText('area privada')).toBeInTheDocument()
    })

    it('sessao com MFA pendente em /login volta para o desafio', async () => {
      mockSession(mfaRequired)
      renderWithProviders(<Tree />, { route: '/login' })
      expect(await screen.findByText('tela de mfa')).toBeInTheDocument()
    })
  })

  describe('RequireSessionStatus', () => {
    it('so exibe o desafio MFA quando a sessao esta com MFA pendente', async () => {
      mockSession(mfaRequired)
      renderWithProviders(<Tree />, { route: '/verificacao-mfa' })
      expect(await screen.findByText('tela de mfa')).toBeInTheDocument()
    })

    it('sem sessao, o desafio MFA redireciona ao login', async () => {
      mockSession({ status: 'auth_required' })
      renderWithProviders(<Tree />, { route: '/verificacao-mfa' })
      expect(await screen.findByText('tela de login')).toBeInTheDocument()
    })

    it('ja autenticado, o desafio MFA redireciona ao contexto', async () => {
      mockSession(authenticated('unico'))
      renderWithProviders(<Tree />, { route: '/verificacao-mfa' })
      expect(await screen.findByText('area privada')).toBeInTheDocument()
    })
  })
})
