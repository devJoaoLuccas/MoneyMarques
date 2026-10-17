import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { resolveDestination } from '../navigation/resolve-destination'
import { getSelectedFamily } from '../state/selected-family'
import type { SessionView } from '../types'

/** Navega para o destino que o estado da sessao e o contexto familiar determinam. */
export function useGoToDestination() {
  const navigate = useNavigate()
  return useCallback(
    (session: SessionView) => navigate(resolveDestination(session, getSelectedFamily()), { replace: true }),
    [navigate],
  )
}
