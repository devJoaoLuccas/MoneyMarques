import { Navigate, Outlet } from 'react-router-dom'
import { resolveDestination } from '../navigation/resolve-destination'
import { getSelectedFamily } from '../state/selected-family'
import type { SessionStatus } from '../types'
import { SessionGate } from './SessionGate'

interface RequireSessionStatusProps {
  status: SessionStatus
}

/** Etapas intermediarias (ex.: desafio MFA): so abrem no estado de sessao esperado. */
export function RequireSessionStatus({ status }: RequireSessionStatusProps) {
  return (
    <SessionGate>
      {(session) =>
        session.status === status ? (
          <Outlet />
        ) : (
          <Navigate to={resolveDestination(session, getSelectedFamily())} replace />
        )
      }
    </SessionGate>
  )
}
