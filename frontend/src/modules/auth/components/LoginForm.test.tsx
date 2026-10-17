import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/api-error'
import { renderWithProviders } from '../../../test/render'
import { authService } from '../services/auth.service'
import type { SessionView } from '../types'
import { LoginForm } from './LoginForm'

vi.mock('../services/auth.service', () => ({ authService: { login: vi.fn() } }))

const authenticated = (tipo: 'sem_familia' | 'unico' = 'unico'): SessionView => ({
  status: 'authenticated',
  usuario: { uid: 'u1', nomeCompleto: 'Ana', email: 'ana@exemplo.com' },
  mfaHabilitado: false,
  contexto: {
    tipo,
    familias: tipo === 'unico' ? [{ uid: 'f1', nome: 'Silva', papel: 'ADMINISTRADOR' }] : [],
    convitesPendentes: [],
  },
})

async function fillAndSubmit(email = 'ana@exemplo.com', senha = 'minha senha') {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('E-mail'), email)
  await user.type(screen.getByLabelText('Senha'), senha)
  await user.click(screen.getByRole('button', { name: /entrar/i }))
  return user
}

describe('LoginForm (AUTH-001)', () => {
  beforeEach(() => {
    vi.mocked(authService.login).mockReset()
  })

  it('expoe os campos com autocomplete correto e "manter sessao" desmarcado', () => {
    renderWithProviders(<LoginForm />, { route: '/login' })
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByRole('checkbox', { name: /manter sessão/i })).not.toBeChecked()
  })

  it('CA-002: sem preencher, mostra erro por campo e nao chama a API', async () => {
    renderWithProviders(<LoginForm />, { route: '/login' })
    await userEvent.setup().click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByText('Informe seu e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()
    expect(authService.login).not.toHaveBeenCalled()
  })

  it('CA-001: envia as credenciais normalizadas e segue para o destino autorizado', async () => {
    vi.mocked(authService.login).mockResolvedValue(authenticated('unico'))
    renderWithProviders(<LoginForm />, { route: '/login' })

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('E-mail'), '  ana@exemplo.com ')
    await user.type(screen.getByLabelText('Senha'), 'minha senha')
    await user.click(screen.getByRole('checkbox', { name: /manter sessão/i }))
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() =>
      expect(authService.login).toHaveBeenCalledWith({
        email: 'ana@exemplo.com',
        senha: 'minha senha',
        manterSessao: true,
      }),
    )
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/app'))
  })

  it.each([
    [authenticated('sem_familia'), '/familia/nova'],
    [{ status: 'mfa_required', usuario: { email: 'a@b.com' }, mfaHabilitado: true } as SessionView, '/verificacao-mfa'],
    [
      { status: 'email_verification_required', usuario: { email: 'a@b.com' }, mfaHabilitado: false } as SessionView,
      '/verificar-email',
    ],
  ])('encaminha conforme o estado da sessao (%#)', async (view, expectedPath) => {
    vi.mocked(authService.login).mockResolvedValue(view)
    renderWithProviders(<LoginForm />, { route: '/login' })
    await fillAndSubmit()
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(expectedPath))
  })

  it('CA-004: credenciais invalidas mostram mensagem generica, mantem o e-mail e liberam o botao', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      new ApiError({
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Não foi possível entrar. Verifique suas credenciais e tente novamente.',
      }),
    )
    renderWithProviders(<LoginForm />, { route: '/login' })
    await fillAndSubmit('ana@exemplo.com', 'errada')

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível entrar.')
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@exemplo.com')
    expect(screen.getByRole('button', { name: /entrar/i })).toBeEnabled()
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
  })

  it('CA-005: limitacao de tentativas informa o tempo de espera', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      new ApiError({ status: 429, code: 'TOO_MANY_ATTEMPTS', message: 'Muitas tentativas.', retryAfterSeconds: 120 }),
    )
    renderWithProviders(<LoginForm />, { route: '/login' })
    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Tente novamente em 2 minutos.')
  })

  it('CA-005: falha de rede e indisponibilidade tem feedback acessivel', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Não foi possível conectar ao servidor.' }),
    )
    renderWithProviders(<LoginForm />, { route: '/login' })
    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar ao servidor.')
  })

  it('bloqueia envios duplicados e mostra progresso enquanto envia', async () => {
    let finish: (view: SessionView) => void = () => {}
    vi.mocked(authService.login).mockReturnValue(new Promise<SessionView>((resolve) => (finish = resolve)))
    renderWithProviders(<LoginForm />, { route: '/login' })

    const user = await fillAndSubmit()
    const button = screen.getByRole('button', { name: /entrar/i })
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'))
    await user.click(button)
    expect(authService.login).toHaveBeenCalledTimes(1)

    finish(authenticated())
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/app'))
  })

  it('oferece caminhos para recuperar a senha e criar conta', () => {
    renderWithProviders(<LoginForm />, { route: '/login' })
    expect(screen.getByRole('link', { name: /esqueci minha senha/i })).toHaveAttribute('href', '/esqueci-senha')
    expect(screen.getByRole('link', { name: /criar conta/i })).toHaveAttribute('href', '/cadastro')
  })
})
