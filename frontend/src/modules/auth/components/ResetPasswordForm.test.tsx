import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/api-error'
import { renderWithProviders } from '../../../test/render'
import { authService } from '../services/auth.service'
import { ResetPasswordForm } from './ResetPasswordForm'

vi.mock('../services/auth.service', () => ({ authService: { resetPassword: vi.fn() } }))

const NEW_PASSWORD = 'Nova-Frase-Longa-Segura-1'

async function submitNewPassword() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Nova senha'), NEW_PASSWORD)
  await user.type(screen.getByLabelText('Confirmar nova senha'), NEW_PASSWORD)
  await user.click(screen.getByRole('button', { name: /redefinir senha/i }))
}

describe('ResetPasswordForm (AUTH-003)', () => {
  beforeEach(() => {
    vi.mocked(authService.resetPassword).mockReset()
  })

  it('le o token do fragmento da URL e o remove do endereco (nao fica em historico/logs)', async () => {
    renderWithProviders(<ResetPasswordForm />, { route: '/redefinir-senha#token=abc123' })
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/redefinir-senha$/))
  })

  it('envia o token e a nova senha; sucesso orienta a entrar de novo', async () => {
    vi.mocked(authService.resetPassword).mockResolvedValue(undefined)
    renderWithProviders(<ResetPasswordForm />, { route: '/redefinir-senha#token=abc123' })
    await submitNewPassword()

    expect(await screen.findByRole('status')).toHaveTextContent(/senha alterada/i)
    expect(authService.resetPassword).toHaveBeenCalledWith('abc123', NEW_PASSWORD)
    expect(screen.getByRole('link', { name: /ir para o login/i })).toHaveAttribute('href', '/login')
  })

  it('CA-014: sem token mostra link invalido com opcao de novo pedido', () => {
    renderWithProviders(<ResetPasswordForm />, { route: '/redefinir-senha' })
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/inválido ou expirou/i)
    expect(screen.getByRole('link', { name: /solicitar novo link/i })).toHaveAttribute('href', '/esqueci-senha')
  })

  it('CA-014: token recusado pelo servidor leva ao estado de link invalido', async () => {
    vi.mocked(authService.resetPassword).mockRejectedValue(
      new ApiError({ status: 400, code: 'INVALID_TOKEN', message: 'Este link é inválido ou expirou. Solicite um novo.' }),
    )
    renderWithProviders(<ResetPasswordForm />, { route: '/redefinir-senha#token=velho' })
    await submitNewPassword()

    expect(await screen.findByRole('alert')).toHaveTextContent(/inválido ou expirou/i)
    expect(screen.getByRole('link', { name: /solicitar novo link/i })).toBeInTheDocument()
  })

  it('CA-015: valida a politica de senha e a confirmacao antes de enviar', async () => {
    renderWithProviders(<ResetPasswordForm />, { route: '/redefinir-senha#token=abc123' })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Nova senha'), 'curta')
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'outra')
    await user.click(screen.getByRole('button', { name: /redefinir senha/i }))

    expect(await screen.findByText(/pelo menos 12 caracteres/i)).toBeInTheDocument()
    expect(authService.resetPassword).not.toHaveBeenCalled()
  })

  it('erro de politica vindo do servidor aparece no campo e mantem o formulario', async () => {
    vi.mocked(authService.resetPassword).mockRejectedValue(
      new ApiError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Verifique os campos informados.',
        fieldErrors: { senha: ['A senha nao pode ser igual ao seu e-mail ou nome.'] },
      }),
    )
    renderWithProviders(<ResetPasswordForm />, { route: '/redefinir-senha#token=abc123' })
    await submitNewPassword()
    expect(await screen.findByText('A senha nao pode ser igual ao seu e-mail ou nome.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument()
  })
})
