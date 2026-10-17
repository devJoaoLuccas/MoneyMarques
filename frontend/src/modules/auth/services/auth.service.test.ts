import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { http } from '../../../shared/lib/http'
import { authService } from './auth.service'

describe('authService (contratos da API de autenticacao)', () => {
  let post: MockInstance<typeof http.post>
  let get: MockInstance<typeof http.get>

  beforeEach(() => {
    post = vi.spyOn(http, 'post')
    get = vi.spyOn(http, 'get')
    post.mockResolvedValue({ data: { status: 'ok' } })
    get.mockResolvedValue({ data: { status: 'auth_required' } })
  })

  it('getSession consulta GET /auth/session e devolve o corpo', async () => {
    await expect(authService.getSession()).resolves.toEqual({ status: 'auth_required' })
    expect(get).toHaveBeenCalledWith('/auth/session')
  })

  it('login envia e-mail, senha e manterSessao', async () => {
    await authService.login({ email: 'ana@exemplo.com', senha: 'x', manterSessao: true })
    expect(post).toHaveBeenCalledWith('/auth/login', { email: 'ana@exemplo.com', senha: 'x', manterSessao: true })
  })

  it('register nao envia a confirmacao de senha e registra o aceite dos termos', async () => {
    await authService.register({
      nomeCompleto: 'Ana',
      email: 'ana@exemplo.com',
      senha: 'Frase-Longa-Segura-1',
      confirmarSenha: 'Frase-Longa-Segura-1',
      aceiteTermos: true,
    })
    expect(post).toHaveBeenCalledWith('/auth/register', {
      nomeCompleto: 'Ana',
      email: 'ana@exemplo.com',
      senha: 'Frase-Longa-Segura-1',
      aceiteTermos: true,
    })
  })

  it('logout, recuperacao e reenvio usam as rotas corretas', async () => {
    await authService.logout()
    await authService.forgotPassword('ana@exemplo.com')
    await authService.resendVerification()
    expect(post).toHaveBeenCalledWith('/auth/logout')
    expect(post).toHaveBeenCalledWith('/auth/password/forgot', { email: 'ana@exemplo.com' })
    expect(post).toHaveBeenCalledWith('/auth/email/resend')
  })

  it('resetPassword envia token e nova senha (sem a confirmacao)', async () => {
    await authService.resetPassword('tok', 'Nova-Frase-Longa-Segura-1')
    expect(post).toHaveBeenCalledWith('/auth/password/reset', { token: 'tok', senha: 'Nova-Frase-Longa-Segura-1' })
  })

  it('verifyEmail envia o token no corpo (nunca na URL)', async () => {
    await authService.verifyEmail('tok')
    expect(post).toHaveBeenCalledWith('/auth/email/verify', { token: 'tok' })
  })

  it('verifyMfa mapeia o modo TOTP para "codigo"', async () => {
    await authService.verifyMfa({ modo: 'totp', codigo: '123456' })
    expect(post).toHaveBeenCalledWith('/auth/mfa/verify', { codigo: '123456' })
  })

  it('verifyMfa mapeia o modo recuperacao para "codigoRecuperacao"', async () => {
    await authService.verifyMfa({ modo: 'recuperacao', codigo: 'ABCDE-FGH23' })
    expect(post).toHaveBeenCalledWith('/auth/mfa/verify', { codigoRecuperacao: 'ABCDE-FGH23' })
  })
})
