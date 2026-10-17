import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toApiError } from '../../../shared/lib/api-error'
import { describeApiError } from '../../../shared/lib/form-errors'
import { paths } from '../../../shared/routes/paths'
import { Alert, Button, LoadingIndicator } from '../../../shared/ui'
import { getSelectedFamily, LogoutButton, resolveDestination, useSession } from '../../auth'
import { useAcceptPendingInvite, useDeclinePendingInvite } from '../hooks/useFamily'
import { ROLE_LABELS } from '../schemas/family.schemas'
import type { FamilyRole } from '../types'
import styles from './FamilyPanels.module.css'

/**
 * Convites pendentes do usuario (AUTH-005 + FAM-005). A sessao so conhece o uid
 * do convite, nunca o token: aceite e recusa usam os endpoints "pendentes", que
 * exigem o mesmo e-mail do convite no servidor.
 */
export function PendingInvitesList() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const accept = useAcceptPendingInvite()
  const decline = useDeclinePendingInvite()
  const [error, setError] = useState<string | null>(null)
  const [activeUid, setActiveUid] = useState<string | null>(null)

  if (isPending) return <LoadingIndicator label="Carregando seus convites" />
  if (!session || session.status !== 'authenticated') {
    return <Navigate to={resolveDestination(session ?? { status: 'auth_required' }, getSelectedFamily())} replace />
  }

  const invites = session.contexto.convitesPendentes
  if (invites.length === 0) {
    return <Navigate to={resolveDestination(session, getSelectedFamily())} replace />
  }

  async function respond(uid: string, action: 'accept' | 'decline') {
    setError(null)
    setActiveUid(uid)
    try {
      if (action === 'accept') {
        await accept.mutateAsync(uid)
        navigate(paths.app, { replace: true })
      } else {
        await decline.mutateAsync(uid)
      }
    } catch (cause) {
      setError(describeApiError(toApiError(cause)))
    } finally {
      setActiveUid(null)
    }
  }

  return (
    <div className={styles.form}>
      {error && <Alert variant="error">{error}</Alert>}
      <ul className={styles.list}>
        {invites.map((invite) => {
          const busy = activeUid === invite.uid
          return (
            <li key={invite.uid} className={styles.card}>
              <div className={styles.cardInfo}>
                <p className={styles.cardTitle}>{invite.familiaNome}</p>
                <p className={styles.cardMeta}>
                  Convite como {ROLE_LABELS[invite.papelOferecido as FamilyRole] ?? invite.papelOferecido}
                </p>
              </div>
              <div className={styles.cardActions}>
                <Button
                  loading={busy && accept.isPending}
                  disabled={busy}
                  aria-label={`Aceitar convite de ${invite.familiaNome}`}
                  onClick={() => void respond(invite.uid, 'accept')}
                >
                  Aceitar
                </Button>
                <Button
                  variant="secondary"
                  loading={busy && decline.isPending}
                  disabled={busy}
                  aria-label={`Recusar convite de ${invite.familiaNome}`}
                  onClick={() => void respond(invite.uid, 'decline')}
                >
                  Recusar
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
      <LogoutButton variant="ghost" label="Sair da conta" />
    </div>
  )
}
