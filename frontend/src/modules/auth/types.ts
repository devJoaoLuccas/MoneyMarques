/** Contratos da API de autenticacao (espelham o backend). */

export type FamilyContextType = 'sem_familia' | 'unico' | 'multiplo' | 'convite_pendente'

export interface FamilyMembership {
  uid: string
  nome: string
  papel: string
}

export interface PendingInvite {
  uid: string
  familiaNome: string
  papelOferecido: string
}

export interface FamilyContext {
  tipo: FamilyContextType
  familias: FamilyMembership[]
  convitesPendentes: PendingInvite[]
}

export interface AuthenticatedUser {
  uid: string
  nomeCompleto: string
  email: string
}

export type SessionView =
  | { status: 'auth_required' }
  | {
      status: 'email_verification_required' | 'mfa_required'
      usuario: { email: string }
      mfaHabilitado: boolean
    }
  | {
      status: 'authenticated'
      usuario: AuthenticatedUser
      mfaHabilitado: boolean
      contexto: FamilyContext
    }

export type SessionStatus = SessionView['status']

export interface LoginPayload {
  email: string
  senha: string
  manterSessao: boolean
}

export interface RegisterPayload {
  nomeCompleto: string
  email: string
  senha: string
  aceiteTermos: boolean
}

export interface MfaVerifyPayload {
  codigo?: string
  codigoRecuperacao?: string
}
