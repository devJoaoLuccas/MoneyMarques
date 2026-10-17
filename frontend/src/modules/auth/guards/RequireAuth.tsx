import { Navigate, Outlet } from 'react-router-dom'
import { resolveDestination } from '../navigation/resolve-destination'
import { getSelectedFamily } from '../state/selected-family'
import { SessionGate } from './SessionGate'

/** Rotas privadas: exige sessao totalmente autenticada (login + e-mail + MFA). */
export function RequireAuth() {
  return (
    <SessionGate>
      {(session) =>
        session.status === 'authenticated' ? (
          <Outlet />
        ) : (
          <Navigate to={resolveDestination(session, getSelectedFamily())} replace />
        )
      }
    </SessionGate>
  )
}
