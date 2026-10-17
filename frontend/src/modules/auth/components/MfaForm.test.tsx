import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/api-error'
import { renderWithProviders } from '../../../test/render'
import { authService } from '../services/auth.service'
import type { SessionView } from '../types'
import { MfaForm } from './MfaForm'

vi.mock('../services/auth.service', () => ({ authService: { verifyMfa: vi.fn(), logout: vi.fn() } }))

const authenticated: SessionView = {
  status: 'authenticated',
  usuario: { uid: 'u1', nomeCompleto: 'Ana', email: 'ana@exemplo.com' },
  mfaHabilitado: true,
  contexto: { tipo: 'unico', familias: [{ uid: 'f1', nome: 'Silva', papel: 'ADMINISTRADOR' }], convitesPendentes: [] },
}

describe('MfaForm (AUTH-004)', () => {
  beforeEach(() => {
    vi.mocked(authService.verifyMfa).mockReset()
    vi.mocked(authService.logout).mockReset()
  })

  it('comeca pedindo o codigo do aplicativo, com teclado numerico e autocomplete de uso unico', () => {
    renderWithProviders(<MfaForm />, { route: '/verificacao-mfa' })
    const field = screen.getByLabelText('Código de verificação')
    expect(field).toHaveAttribute('inputmode', 'numeric')
    expect(field).toHaveAttribute('autocomplete', 'one-time-code')
  })

  it('valida os 6 digitos antes de enviar', async () => {
    renderWithProviders(<MfaForm />, { route: '/verificacao-mfa' })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Código de verificação'), '123')
    await user.click(screen.getByRole('button', { name: /verificar/i }))
    expect(await screen.findByText('O código deve ter 6 dígitos.')).toBeInTheDocument()
    expect(authService.verifyMfa).not.toHaveBeenCalled()
  })

  it('CA-018: codigo valido conclui o desafio e segue o fluxo', async () => {
    vi.mocked(authService.verifyMfa).mockResolvedValue(authenticated)
    renderWithProviders(<MfaForm />, { route: '/verificacao-mfa' })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Código de verificação'), '123456')
    await user.click(screen.getByRole('button', { name: /verificar/i }))

    await waitFor(() => expect(authService.verifyMfa).toHaveBeenCalledWith({ modo: 'totp', codigo: '123456' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/app'))
  })

  it('permite alternar para o codigo de recuperacao e envia no modo correto', async () => {
    vi.mocked(authService.verifyMfa).mockResolvedValue(authenticated)
    renderWithProviders(<MfaForm />, { route: '/verificacao-mfa' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /usar código de recuperação/i }))

    const field = screen.getByLabelText('Código de recuperação')
    expect(field).not.toHaveAttribute('inputmode', 'numeric')
    await user.type(field, 'ABCDE-FGH23')
    await user.click(screen.getByRole('button', { name: /verificar/i }))

    await waitFor(() =>
      expect(authService.verifyMfa).toHaveBeenCalledWith({ modo: 'recuperacao', codigo: 'ABCDE-FGH23' }),
    )
    expect(screen.getByRole('button', { name: /usar código do aplicativo/i })).toBeInTheDocument()
  })

  it('CA-019: codigo invalido mostra erro e permite nova tentativa', async () => {
    vi.mocked(authService.verifyMfa).mockRejectedValue(
      new ApiError({ status: 401, code: 'INVALID_MFA_CODE', message: 'Código inválido ou já utilizado.' }),
    )
    renderWithProviders(<MfaForm />, { route: '/verificacao-mfa' })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Código de verificação'), '000000')
    await user.click(screen.getByRole('button', { name: /verificar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Código inválido ou já utilizado.')
    expect(screen.getByRole('button', { name: /verificar/i })).toBeEnabled()
  })

  it('CA-019: tentativas limitadas informam o tempo de espera', async () => {
    vi.mocked(authService.verifyMfa).mockRejectedValue(
      new ApiError({ status: 429, code: 'TOO_MANY_ATTEMPTS', message: 'Muitas tentativas.', retryAfterSeconds: 300 }),
    )
    renderWithProviders(<MfaForm />, { route: '/verificacao-mfa' })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Código de verificação'), '000000')
    await user.click(screen.getByRole('button', { name: /verificar/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Tente novamente em 5 minutos.')
  })

  it('"Voltar ao login" encerra a sessao pendente e retorna a autenticacao', async () => {
    vi.mocked(authService.logout).mockResolvedValue(undefined)
    renderWithProviders(<MfaForm />, { route: '/verificacao-mfa' })
    await userEvent.setup().click(screen.getByRole('button', { name: /voltar ao login/i }))

    await waitFor(() => expect(authService.logout).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/login'))
  })
})
