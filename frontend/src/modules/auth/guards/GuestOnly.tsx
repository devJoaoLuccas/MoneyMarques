import { Navigate, Outlet } from 'react-router-dom'
import { resolveDestination } from '../navigation/resolve-destination'
import { getSelectedFamily } from '../state/selected-family'
import { SessionGate } from './SessionGate'

/** Telas para quem ainda nao tem sessao: com sessao valida, segue ao contexto autorizado. */
export function GuestOnly() {
  return (
    <SessionGate>
      {(session) =>
        session.status === 'auth_required' ? (
          <Outlet />
        ) : (
          <Navigate to={resolveDestination(session, getSelectedFamily())} replace />
        )
      }
    </SessionGate>
  )
}
