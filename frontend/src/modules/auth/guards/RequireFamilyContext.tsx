import { Navigate, Outlet } from 'react-router-dom'
import { paths } from '../../../shared/routes/paths'
import { resolveDestination } from '../navigation/resolve-destination'
import { getSelectedFamily } from '../state/selected-family'
import { SessionGate } from './SessionGate'

/**
 * AUTH-005: a area do app exige um contexto familiar resolvido. Orienta a
 * navegacao; a autorizacao real e feita pelo servidor em cada requisicao.
 */
export function RequireFamilyContext() {
  return (
    <SessionGate>
      {(session) => {
        const destination = resolveDestination(session, getSelectedFamily())
        return destination === paths.app ? <Outlet /> : <Navigate to={destination} replace />
      }}
    </SessionGate>
  )
}
