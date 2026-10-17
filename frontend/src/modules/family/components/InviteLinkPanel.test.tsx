import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/api-error'
import { renderWithProviders } from '../../../test/render'
import { getSelectedFamily } from '../../auth'
import { authService } from '../../auth/services/auth.service'
import type { SessionView } from '../../auth/types'
import { familyService } from '../services/family.service'
import { InviteLinkPanel } from './InviteLinkPanel'

vi.mock('../services/family.service', () => ({
  familyService: { previewInvite: vi.fn(), acceptInvite: vi.fn(), declineInvite: vi.fn() },
}))
vi.mock('../../auth/services/auth.service', () => ({ authService: { getSession: vi.fn(), logout: vi.fn() } }))

const authenticated: SessionView = {
  status: 'authenticated',
  usuario: { uid: 'u1', nomeCompleto: 'Bruno', email: 'bruno@exemplo.com' },
  mfaHabilitado: false,
  contexto: { tipo: 'sem_familia', familias: [], convitesPendentes: [] },
}

const preview = {
  familiaNome: 'Família Silva',
  convidadoPorNome: 'Ana Admin',
  papelOferecido: 'VISUALIZADOR' as const,
  expiraEm: '2026-10-25T12:00:00.000Z',
}

const route = '/convite#token=tok_123'

describe('InviteLinkPanel (FAM-005, CA-FAM-022)', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.mocked(familyService.previewInvite).mockReset().mockResolvedValue(preview)
    vi.mocked(familyService.acceptInvite).mockReset()
    vi.mocked(familyService.declineInvite).mockReset()
    vi.mocked(authService.getSession).mockReset().mockResolvedValue(authenticated)
  })

  it('sem token no link mostra erro neutro', () => {
    renderWithProviders(<InviteLinkPanel />, { route: '/convite' })
    expect(screen.getByRole('alert')).toHaveTextContent(/convite é inválido/i)
    expect(familyService.previewInvite).not.toHaveBeenCalled()
  })

  it('visitante e orientado a entrar ou criar conta, sem consultar o convite', async () => {
    vi.mocked(authService.getSession).mockResolvedValue({ status: 'auth_required' })
    renderWithProviders(<InviteLinkPanel />, { route })

    expect(await screen.findByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro')
    expect(familyService.previewInvite).not.toHaveBeenCalled()
  })

  it('autenticado ve a previa (somente familia, quem convidou, papel e validade) e remove o token da URL', async () => {
    renderWithProviders(<InviteLinkPanel />, { route })

    expect(await screen.findByText('Família Silva')).toBeInTheDocument()
    expect(screen.getByText(/ana admin convidou você como visualizador/i)).toBeInTheDocument()
    expect(screen.getByText(/válido até 25\/10\/2026/i)).toBeInTheDocument()
    expect(familyService.previewInvite).toHaveBeenCalledWith('tok_123')
    await waitFor(() => expect(screen.getByTestId('location')).not.toHaveTextContent('token'))
  })

  it('aceitar: guarda o contexto da familia e segue para o app', async () => {
    vi.mocked(familyService.acceptInvite).mockResolvedValue({ familiaUid: 'f1' })
    renderWithProviders(<InviteLinkPanel />, { route })
    await userEvent.setup().click(await screen.findByRole('button', { name: /aceitar convite/i }))

    await waitFor(() => expect(familyService.acceptInvite).toHaveBeenCalledWith('tok_123'))
    await waitFor(() => expect(getSelectedFamily()).toBe('f1'))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/app'))
  })

  it('recusar: chama a API e nao guarda contexto', async () => {
    vi.mocked(familyService.declineInvite).mockResolvedValue(undefined)
    renderWithProviders(<InviteLinkPanel />, { route })
    await userEvent.setup().click(await screen.findByRole('button', { name: /recusar/i }))

    await waitFor(() => expect(familyService.declineInvite).toHaveBeenCalledWith('tok_123'))
    expect(getSelectedFamily()).toBeNull()
  })

  it('convite invalido, expirado ou de outro e-mail mostra a mesma mensagem neutra', async () => {
    vi.mocked(familyService.previewInvite).mockRejectedValue(
      new ApiError({ status: 400, code: 'INVALID_TOKEN', message: 'Este link é inválido ou expirou.' }),
    )
    renderWithProviders(<InviteLinkPanel />, { route })

    expect(await screen.findByRole('alert')).toHaveTextContent(/inválido, expirou ou foi enviado para outro e-mail/i)
    expect(screen.queryByRole('button', { name: /aceitar/i })).not.toBeInTheDocument()
  })
})
