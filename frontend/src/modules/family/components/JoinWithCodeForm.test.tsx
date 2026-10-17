import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/api-error'
import { renderWithProviders } from '../../../test/render'
import { getSelectedFamily } from '../../auth'
import { familyService } from '../services/family.service'
import { JoinWithCodeForm } from './JoinWithCodeForm'

vi.mock('../services/family.service', () => ({
  familyService: { previewInviteCode: vi.fn(), redeemInviteCode: vi.fn() },
}))

const preview = {
  familiaNome: 'Família Silva',
  convidadoPorNome: 'Ana Maria',
  papelOferecido: 'VISUALIZADOR' as const,
  expiraEm: '2026-10-18T15:00:00.000Z',
}

const codigoInvalido = () =>
  new ApiError({
    status: 400,
    code: 'INVALID_INVITE_CODE',
    message: 'Código inválido ou expirado. Confira com quem convidou você.',
  })

describe('JoinWithCodeForm (D-FAM-009)', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.mocked(familyService.previewInviteCode).mockReset()
    vi.mocked(familyService.redeemInviteCode).mockReset()
  })

  it('pede o codigo antes de consultar o servidor', async () => {
    renderWithProviders(<JoinWithCodeForm />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText('Informe o código que você recebeu.')).toBeInTheDocument()
    expect(familyService.previewInviteCode).not.toHaveBeenCalled()
  })

  it('mostra a familia e o papel antes de entrar, e so entao consome o codigo', async () => {
    vi.mocked(familyService.previewInviteCode).mockResolvedValue(preview)
    vi.mocked(familyService.redeemInviteCode).mockResolvedValue({ familiaUid: 'f1' })
    renderWithProviders(<JoinWithCodeForm />, { route: '/familia/nova' })
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Código de convite'), 'abcd-efgh')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText('Família Silva')).toBeInTheDocument()
    expect(screen.getByText(/Convite de Ana Maria como Visualizador/)).toBeInTheDocument()
    expect(familyService.previewInviteCode).toHaveBeenCalledWith('ABCD-EFGH')
    expect(familyService.redeemInviteCode).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Entrar na família' }))
    await waitFor(() => expect(familyService.redeemInviteCode).toHaveBeenCalledWith('ABCD-EFGH'))
    await waitFor(() => expect(getSelectedFamily()).toBe('f1'))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/app'))
  })

  it('codigo invalido: mensagem do servidor, sem revelar o motivo', async () => {
    vi.mocked(familyService.previewInviteCode).mockRejectedValue(codigoInvalido())
    renderWithProviders(<JoinWithCodeForm />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Código de convite'), 'ZZZZ-ZZZZ')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText(/Código inválido ou expirado/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entrar na família' })).not.toBeInTheDocument()
  })

  it('muitas tentativas: informa quanto esperar', async () => {
    vi.mocked(familyService.previewInviteCode).mockRejectedValue(
      new ApiError({ status: 429, code: 'TOO_MANY_ATTEMPTS', message: 'Muitas tentativas.', retryAfterSeconds: 600 }),
    )
    renderWithProviders(<JoinWithCodeForm />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Código de convite'), 'AAAA-AAAA')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText(/Muitas tentativas\. Tente novamente em/)).toBeInTheDocument()
  })

  it('codigo usado por outra pessoa entre a previa e a entrada: volta ao inicio com erro', async () => {
    vi.mocked(familyService.previewInviteCode).mockResolvedValue(preview)
    vi.mocked(familyService.redeemInviteCode).mockRejectedValue(codigoInvalido())
    renderWithProviders(<JoinWithCodeForm />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Código de convite'), 'ABCD-EFGH')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(await screen.findByRole('button', { name: 'Entrar na família' }))
    expect(await screen.findByText(/Código inválido ou expirado/)).toBeInTheDocument()
    expect(screen.getByLabelText('Código de convite')).toBeInTheDocument()
    expect(getSelectedFamily()).toBeNull()
  })

  it('Voltar descarta a previa e permite corrigir o codigo', async () => {
    vi.mocked(familyService.previewInviteCode).mockResolvedValue(preview)
    renderWithProviders(<JoinWithCodeForm />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Código de convite'), 'ABCD-EFGH')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(await screen.findByRole('button', { name: 'Voltar' }))
    expect(screen.getByLabelText('Código de convite')).toHaveValue('ABCD-EFGH')
  })
})
