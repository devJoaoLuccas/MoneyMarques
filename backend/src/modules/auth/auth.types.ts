/**
 * Estado de autenticacao de uma sessao.
 * - auth_required: sem sessao valida.
 * - email_verification_required: sessao valida, e-mail ainda nao confirmado.
 * - mfa_required: senha validada, segundo fator pendente.
 * - authenticated: todas as verificacoes concluidas.
 */
export type AuthStatus =
  | 'auth_required'
  | 'email_verification_required'
  | 'mfa_required'
  | 'authenticated';

export type ActiveAuthStatus = Exclude<AuthStatus, 'auth_required'>;

export interface AuthenticatedUser {
  uid: string;
  nomeCompleto: string;
  email: string;
}

/** Contexto de autenticacao anexado a requisicao pelo AuthGuard. */
export interface AuthContext {
  sessaoUid: string;
  manterSessao: boolean;
  status: ActiveAuthStatus;
  usuario: AuthenticatedUser;
  mfaHabilitado: boolean;
}

export type FamilyContextType =
  'sem_familia' | 'unico' | 'multiplo' | 'convite_pendente';

export interface FamilyContext {
  tipo: FamilyContextType;
  familias: { uid: string; nome: string; papel: string }[];
  convitesPendentes: {
    uid: string;
    familiaNome: string;
    papelOferecido: string;
  }[];
}

export type SessionView =
  | { status: 'auth_required' }
  | {
      status: Exclude<ActiveAuthStatus, 'authenticated'>;
      usuario: { email: string };
      mfaHabilitado: boolean;
    }
  | {
      status: 'authenticated';
      usuario: AuthenticatedUser;
      mfaHabilitado: boolean;
      contexto: FamilyContext;
    };
