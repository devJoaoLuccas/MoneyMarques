import { paths, type AppPath } from '../../../shared/routes/paths'
import type { SessionView } from '../types'

/**
 * Decide para onde levar o usuario conforme o estado da sessao e o contexto
 * familiar (fluxo geral + AUTH-005). Isto orienta a navegacao; a autorizacao
 * real e sempre do servidor (RN-AUTH-012), por isso uma familia escolhida que
 * nao consta nos vinculos do usuario e ignorada.
 */
export function resolveDestination(session: SessionView, selectedFamilyUid?: string | null): AppPath {
  switch (session.status) {
    case 'auth_required':
      return paths.login
    case 'email_verification_required':
      return paths.verifyEmail
    case 'mfa_required':
      return paths.mfa
    case 'authenticated': {
      const { tipo, familias } = session.contexto
      if (tipo === 'sem_familia') return paths.familyOnboarding
      if (tipo === 'convite_pendente') return paths.familyInvites
      if (tipo === 'unico') return paths.app
      const chosen = selectedFamilyUid && familias.some((familia) => familia.uid === selectedFamilyUid)
      return chosen ? paths.app : paths.context
    }
  }
}
