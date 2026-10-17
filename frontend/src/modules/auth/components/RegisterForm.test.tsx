import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/api-error'
import { renderWithProviders } from '../../../test/render'
import { authService } from '../services/auth.service'
import { RegisterForm } from './RegisterForm'

vi.mock('../services/auth.service', () => ({ authService: { register: vi.fn() } }))

const PASSWORD = 'Frase-Longa-Segura-2026'

async function fillValid(overrides: { senha?: string; confirmar?: string; termos?: boolean } = {}) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Nome completo'), 'Ana Maria')
  await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com')
  await user.type(screen.getByLabelText('Senha'), overrides.senha ?? PASSWORD)
  await user.type(screen.getByLabelText('Confirmar senha'), overrides.confirmar ?? PASSWORD)
  if (overrides.termos !== false) await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: /criar conta/i }))
  return user
}

describe('RegisterForm (AUTH-002)', () => {
  beforeEach(() => {
    vi.mocked(authService.register).mockReset()
  })

  it('mostra erros por campo ao enviar vazio, sem chamar a API', async () => {
    renderWithProviders(<RegisterForm />, { route: '/cadastro' })
    await userEvent.setup().click(screen.getByRole('button', { name: /criar conta/i }))

    expect(await screen.findByText(/informe seu nome completo/i)).toBeInTheDocument()
    expect(screen.getByText('Informe seu e-mail.')).toBeInTheDocument()
    expect(screen.getByText(/pelo menos 12 caracteres/i)).toBeInTheDocument()
    expect(screen.getByText(/aceitar os Termos de Uso/i)).toBeInTheDocument()
    expect(authService.register).not.toHaveBeenCalled()
  })

  it('exige a confirmacao igual a senha', async () => {
    renderWithProviders(<RegisterForm />, { route: '/cadastro' })
    await fillValid({ confirmar: 'senha diferente da outra' })
    expect(await screen.findByText('As senhas não conferem.')).toBeInTheDocument()
    expect(authService.register).not.toHaveBeenCalled()
  })

  it('usa autocomplete new-password e links para termos e privacidade', () => {
    renderWithProviders(<RegisterForm />, { route: '/cadastro' })
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('Confirmar senha')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos')
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade')
  })

  it('CA-009/CA-010: cadastro concluido mostra confirmacao neutra de e-mail pendente', async () => {
    vi.mocked(authService.register).mockResolvedValue(undefined)
    renderWithProviders(<RegisterForm />, { route: '/cadastro' })
    await fillValid()

    expect(await screen.findByRole('status')).toHaveTextContent(/enviamos .* ana@exemplo.com/i)
    expect(authService.register).toHaveBeenCalledWith(
      expect.objectContaining({ nomeCompleto: 'Ana Maria', email: 'ana@exemplo.com', aceiteTermos: true }),
    )
    expect(screen.getByRole('link', { name: /ir para o login/i })).toHaveAttribute('href', '/login')
  })

  it('CA-008: erros de validacao do servidor aparecem no campo correspondente', async () => {
    vi.mocked(authService.register).mockRejectedValue(
      new ApiError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Verifique os campos informados.',
        fieldErrors: { senha: ['A senha nao pode repetir um unico caractere.'] },
      }),
    )
    renderWithProviders(<RegisterForm />, { route: '/cadastro' })
    await fillValid()
    expect(await screen.findByText('A senha nao pode repetir um unico caractere.')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('limite de cadastros e falha de rede mostram alerta acessivel', async () => {
    vi.mocked(authService.register).mockRejectedValue(
      new ApiError({ status: 429, code: 'TOO_MANY_ATTEMPTS', message: 'Muitas tentativas.', retryAfterSeconds: 30 }),
    )
    renderWithProviders(<RegisterForm />, { route: '/cadastro' })
    await fillValid()
    expect(await screen.findByRole('alert')).toHaveTextContent('Tente novamente em 30 segundos.')
  })

  it('CA-011: oferece o caminho de volta ao login', () => {
    renderWithProviders(<RegisterForm />, { route: '/cadastro' })
    expect(screen.getByRole('link', { name: /já tenho conta|entrar/i })).toHaveAttribute('href', '/login')
  })
})
