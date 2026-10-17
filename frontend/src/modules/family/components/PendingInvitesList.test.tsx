import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/api-error'
import { renderWithProviders } from '../../../test/render'
import { getSelectedFamily } from '../../auth'
import { authService } from '../../auth/services/auth.service'
import type { SessionView } from '../../auth/types'
import { familyService } from '../services/family.service'
import { PendingInvitesList } from './PendingInvitesList'

vi.mock('../services/family.service', () => ({
  familyService: { acceptPendingInvite: vi.fn(), declinePendingInvite: vi.fn() },
}))
vi.mock('../../auth/services/auth.service', () => ({ authService: { getSession: vi.fn(), logout: vi.fn() } }))

const withInvites: SessionView = {
  status: 'authenticated',
  usuario: { uid: 'u1', nomeCompleto: 'Bruno', email: 'bruno@exemplo.com' },
  mfaHabilitado: false,
  contexto: {
    tipo: 'convite_pendente',
    familias: [],
    convitesPendentes: [
      { uid: 'c1', familiaNome: 'Família Silva', papelOferecido: 'INTEGRANTE' },
      { uid: 'c2', familiaNome: 'Família Souza', papelOferecido: 'VISUALIZADOR' },
    ],
  },
}

describe('PendingInvitesList (FAM-005, AUTH-005)', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.mocked(familyService.acceptPendingInvite).mockReset()
    vi.mocked(familyService.declinePendingInvite).mockReset()
    vi.mocked(authService.getSession).mockReset().mockResolvedValue(withInvites)
  })

  it('lista cada convite com a familia e o papel oferecido', async () => {
    renderWithProviders(<PendingInvitesList />, { route: '/familia/convites' })
    expect(await screen.findByText('Família Silva')).toBeInTheDocument()
    expect(screen.getByText(/convite como integrante/i)).toBeInTheDocument()
    expect(screen.getByText(/convite como visualizador/i)).toBeInTheDocument()
  })

  it('aceitar: guarda a familia como contexto e segue para o app', async () => {
    vi.mocked(familyService.acceptPendingInvite).mockResolvedValue({ familiaUid: 'f1' })
    renderWithProviders(<PendingInvitesList />, { route: '/familia/convites' })
    await userEvent.setup().click(await screen.findByRole('button', { name: /aceitar convite de família silva/i }))

    await waitFor(() => expect(familyService.acceptPendingInvite).toHaveBeenCalledWith('c1'))
    await waitFor(() => expect(getSelectedFamily()).toBe('f1'))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/app'))
  })

  it('recusar: chama a API e nao entra na familia', async () => {
    vi.mocked(familyService.declinePendingInvite).mockResolvedValue(undefined)
    renderWithProviders(<PendingInvitesList />, { route: '/familia/convites' })
    await userEvent.setup().click(await screen.findByRole('button', { name: /recusar convite de família souza/i }))

    await waitFor(() => expect(familyService.declinePendingInvite).toHaveBeenCalledWith('c2'))
    expect(familyService.acceptPendingInvite).not.toHaveBeenCalled()
    expect(getSelectedFamily()).toBeNull()
  })

  it('erro do servidor aparece em alerta e mantem a lista', async () => {
    vi.mocked(familyService.acceptPendingInvite).mockRejectedValue(
      new ApiError({ status: 400, code: 'INVALID_TOKEN', message: 'Este link é inválido ou expirou.' }),
    )
    renderWithProviders(<PendingInvitesList />, { route: '/familia/convites' })
    await userEvent.setup().click(await screen.findByRole('button', { name: /aceitar convite de família silva/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Este link é inválido ou expirou.')
    expect(screen.getByText('Família Silva')).toBeInTheDocument()
  })

  it('sem convites pendentes volta ao destino da sessao', async () => {
    vi.mocked(authService.getSession).mockResolvedValue({
      ...withInvites,
      contexto: { tipo: 'sem_familia', familias: [], convitesPendentes: [] },
    } as SessionView)
    renderWithProviders(<PendingInvitesList />, { route: '/familia/convites' })
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/familia/nova'))
  })
})
