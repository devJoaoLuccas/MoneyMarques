import { Navigate } from 'react-router-dom'
import { getSelectedFamily, resolveDestination, SessionGate } from '../../modules/auth'

/** "/" leva ao destino que o estado da sessao determina (login, MFA, contexto ou app). */
export function RootRedirect() {
  return (
    <SessionGate>{(session) => <Navigate to={resolveDestination(session, getSelectedFamily())} replace />}</SessionGate>
  )
}
