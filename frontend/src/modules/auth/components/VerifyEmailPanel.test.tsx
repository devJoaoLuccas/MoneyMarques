import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/api-error'
import { renderWithProviders } from '../../../test/render'
import { authService } from '../services/auth.service'
import type { SessionView } from '../types'
import { VerifyEmailPanel } from './VerifyEmailPanel'

vi.mock('../services/auth.service', () => ({
  authService: { getSession: vi.fn(), verifyEmail: vi.fn(), resendVerification: vi.fn(), logout: vi.fn() },
}))

const emailPending: SessionView = {
  status: 'email_verification_required',
  usuario: { email: 'ana@exemplo.com' },
  mfaHabilitado: false,
}

describe('VerifyEmailPanel (RN-AUTH-009, CA-010)', () => {
  beforeEach(() => {
    vi.mocked(authService.getSession).mockReset().mockResolvedValue({ status: 'auth_required' })
    vi.mocked(authService.verifyEmail).mockReset()
    vi.mocked(authService.resendVerification).mockReset()
    vi.mocked(authService.logout).mockReset()
  })

  describe('com token no link (#token=)', () => {
    it('confirma o e-mail uma unica vez, remove o token da URL e orienta a entrar', async () => {
      vi.mocked(authService.verifyEmail).mockResolvedValue(undefined)
      renderWithProviders(<VerifyEmailPanel />, { route: '/verificar-email#token=abc123' })

      await waitFor(() => expect(screen.getByText(/e-mail confirmado/i)).toBeInTheDocument())
      expect(authService.verifyEmail).toHaveBeenCalledTimes(1)
      expect(authService.verifyEmail).toHaveBeenCalledWith('abc123')
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/verificar-email$/)
      expect(screen.getByRole('link', { name: /ir para o login/i })).toHaveAttribute('href', '/login')
    })

    it('token invalido ou expirado mostra erro sem detalhes sensiveis', async () => {
      vi.mocked(authService.verifyEmail).mockRejectedValue(
        new ApiError({ status: 400, code: 'INVALID_TOKEN', message: 'Este link é inválido ou expirou. Solicite um novo.' }),
      )
      renderWithProviders(<VerifyEmailPanel />, { route: '/verificar-email#token=velho' })
      expect(await screen.findByRole('alert')).toHaveTextContent(/inválido ou expirou/i)
      expect(screen.getByRole('link', { name: /ir para o login/i })).toBeInTheDocument()
    })
  })

  describe('sem token', () => {
    it('com e-mail pendente, mostra a tela de confirmacao e permite reenviar', async () => {
      vi.mocked(authService.getSession).mockResolvedValue(emailPending)
      vi.mocked(authService.resendVerification).mockResolvedValue(undefined)
      renderWithProviders(<VerifyEmailPanel />, { route: '/verificar-email' })

      expect(await screen.findByText(/ana@exemplo.com/)).toBeInTheDocument()
      await userEvent.setup().click(screen.getByRole('button', { name: /reenviar e-mail/i }))
      expect(await screen.findByRole('status')).toHaveTextContent(/enviamos um novo link/i)
      expect(authService.resendVerification).toHaveBeenCalledTimes(1)
    })

    it('limite de reenvios informa o tempo de espera', async () => {
      vi.mocked(authService.getSession).mockResolvedValue(emailPending)
      vi.mocked(authService.resendVerification).mockRejectedValue(
        new ApiError({ status: 429, code: 'TOO_MANY_ATTEMPTS', message: 'Muitas tentativas.', retryAfterSeconds: 600 }),
      )
      renderWithProviders(<VerifyEmailPanel />, { route: '/verificar-email' })
      await userEvent.setup().click(await screen.findByRole('button', { name: /reenviar e-mail/i }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Tente novamente em 10 minutos.')
    })

    it('permite sair da conta', async () => {
      vi.mocked(authService.getSession).mockResolvedValue(emailPending)
      vi.mocked(authService.logout).mockResolvedValue(undefined)
      renderWithProviders(<VerifyEmailPanel />, { route: '/verificar-email' })
      await userEvent.setup().click(await screen.findByRole('button', { name: /sair/i }))
      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/login'))
    })

    it('sem sessao, orienta a abrir o link recebido ou entrar', async () => {
      renderWithProviders(<VerifyEmailPanel />, { route: '/verificar-email' })
      expect(await screen.findByText(/abra o link/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /ir para o login/i })).toHaveAttribute('href', '/login')
    })
  })
})
