import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/api-error'
import { renderWithProviders } from '../../../test/render'
import { authService } from '../services/auth.service'
import { ForgotPasswordForm } from './ForgotPasswordForm'

vi.mock('../services/auth.service', () => ({ authService: { forgotPassword: vi.fn() } }))

const NEUTRAL = 'Se houver uma conta associada a esse e-mail, você receberá instruções para redefinir sua senha.'

describe('ForgotPasswordForm (AUTH-003, CA-013)', () => {
  beforeEach(() => {
    vi.mocked(authService.forgotPassword).mockReset()
  })

  it('pede apenas o e-mail e valida o formato', async () => {
    renderWithProviders(<ForgotPasswordForm />, { route: '/esqueci-senha' })
    await userEvent.setup().type(screen.getByLabelText('E-mail'), 'invalido')
    await userEvent.setup().click(screen.getByRole('button', { name: /enviar instruções/i }))

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(authService.forgotPassword).not.toHaveBeenCalled()
  })

  it('mostra sempre a mensagem neutra apos o envio, sem revelar se a conta existe', async () => {
    vi.mocked(authService.forgotPassword).mockResolvedValue(undefined)
    renderWithProviders(<ForgotPasswordForm />, { route: '/esqueci-senha' })

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('E-mail'), ' ana@exemplo.com ')
    await user.click(screen.getByRole('button', { name: /enviar instruções/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(NEUTRAL)
    expect(authService.forgotPassword).toHaveBeenCalledWith('ana@exemplo.com')
  })

  it('falha de rede/limite mostra alerta e permite tentar de novo', async () => {
    vi.mocked(authService.forgotPassword).mockRejectedValue(
      new ApiError({ status: 429, code: 'TOO_MANY_ATTEMPTS', message: 'Muitas tentativas.', retryAfterSeconds: 60 }),
    )
    renderWithProviders(<ForgotPasswordForm />, { route: '/esqueci-senha' })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com')
    await user.click(screen.getByRole('button', { name: /enviar instruções/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Tente novamente em 1 minuto.')
    expect(screen.getByRole('button', { name: /enviar instruções/i })).toBeEnabled()
  })

  it('oferece o retorno ao login', () => {
    renderWithProviders(<ForgotPasswordForm />, { route: '/esqueci-senha' })
    expect(screen.getByRole('link', { name: /voltar ao login/i })).toHaveAttribute('href', '/login')
  })
})
