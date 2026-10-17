import { http } from '../../../shared/lib/http'
import type { MfaFormValues, RegisterFormValues } from '../schemas/auth.schemas'
import type { LoginPayload, SessionView } from '../types'

/** Unica porta de saida do modulo para a API de autenticacao. Sem regra de negocio. */
export const authService = {
  async getSession(): Promise<SessionView> {
    const { data } = await http.get<SessionView>('/auth/session')
    return data
  },

  async login(payload: LoginPayload): Promise<SessionView> {
    const { data } = await http.post<SessionView>('/auth/login', payload)
    return data
  },

  async register(values: RegisterFormValues): Promise<void> {
    const { nomeCompleto, email, senha, aceiteTermos } = values
    await http.post('/auth/register', { nomeCompleto, email, senha, aceiteTermos })
  },

  async logout(): Promise<void> {
    await http.post('/auth/logout')
  },

  async forgotPassword(email: string): Promise<void> {
    await http.post('/auth/password/forgot', { email })
  },

  async resetPassword(token: string, senha: string): Promise<void> {
    await http.post('/auth/password/reset', { token, senha })
  },

  async verifyEmail(token: string): Promise<void> {
    await http.post('/auth/email/verify', { token })
  },

  async resendVerification(): Promise<void> {
    await http.post('/auth/email/resend')
  },

  async verifyMfa({ modo, codigo }: MfaFormValues): Promise<SessionView> {
    const body = modo === 'totp' ? { codigo } : { codigoRecuperacao: codigo }
    const { data } = await http.post<SessionView>('/auth/mfa/verify', body)
    return data
  },
}
