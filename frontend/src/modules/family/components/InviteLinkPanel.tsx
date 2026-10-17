import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toApiError } from '../../../shared/lib/api-error'
import { describeApiError } from '../../../shared/lib/form-errors'
import { formatDate } from '../../../shared/lib/format-date'
import { paths } from '../../../shared/routes/paths'
import { Alert, Button, ButtonLink, LoadingIndicator } from '../../../shared/ui'
import { getSelectedFamily, readTokenFromHash, resolveDestination, useSession } from '../../auth'
import { useAcceptInvite, useDeclineInvite, useInvitePreview } from '../hooks/useFamily'
import { ROLE_LABELS } from '../schemas/family.schemas'
import styles from './FamilyPanels.module.css'

const INVALID_INVITE =
  'Este convite é inválido, expirou ou foi enviado para outro e-mail. Peça um novo convite ao administrador.'

/**
 * Link do e-mail (/convite#token=...). O token fica no fragmento (nao e enviado a
 * servidores/logs) e e removido da barra de enderecos logo ao ler. Sem sessao
 * completa, orienta a entrar; depois do login o convite aparece na lista de
 * convites pendentes (resolvida por e-mail no servidor).
 */
export function InviteLinkPanel() {
  const location = useLocation()
  const navigate = useNavigate()
  const [token] = useState(() => readTokenFromHash(location.hash))
  const { data: session, isPending } = useSession()
  const authenticated = session?.status === 'authenticated'
  const preview = useInvitePreview(token, authenticated)
  const accept = useAcceptInvite()
  const decline = useDeclineInvite()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (location.hash) navigate({ hash: '' }, { replace: true })
  }, [location.hash, navigate])

  if (!token) return <Alert variant="error">{INVALID_INVITE}</Alert>
  if (isPending || !session) return <LoadingIndicator label="Verificando sua sessão" />

  if (session.status === 'auth_required') {
    return (
      <div className={styles.form}>
        <Alert variant="info">
          Entre ou crie sua conta com o e-mail que recebeu o convite. Depois de entrar, o convite aparecerá para você
          aceitar.
        </Alert>
        <ButtonLink to={paths.login} variant="primary" fullWidth>
          Entrar
        </ButtonLink>
        <ButtonLink to={paths.register} variant="secondary" fullWidth>
          Criar conta
        </ButtonLink>
      </div>
    )
  }

  if (session.status !== 'authenticated') {
    return <Navigate to={resolveDestination(session, getSelectedFamily())} replace />
  }

  if (preview.isPending) return <LoadingIndicator label="Carregando convite" />
  if (preview.isError) {
    const apiError = toApiError(preview.error)
    return (
      <Alert variant="error">{apiError.code === 'INVALID_TOKEN' ? INVALID_INVITE : describeApiError(apiError)}</Alert>
    )
  }

  const invite = preview.data

  async function respond(action: 'accept' | 'decline') {
    setError(null)
    try {
      if (action === 'accept') {
        await accept.mutateAsync(token as string)
        navigate(paths.app, { replace: true })
      } else {
        await decline.mutateAsync(token as string)
        navigate(paths.root, { replace: true })
      }
    } catch (cause) {
      const apiError = toApiError(cause)
      setError(apiError.code === 'INVALID_TOKEN' ? INVALID_INVITE : describeApiError(apiError))
    }
  }

  return (
    <div className={styles.form}>
      {error && <Alert variant="error">{error}</Alert>}
      <div className={styles.card}>
        <div className={styles.cardInfo}>
          <p className={styles.cardTitle}>{invite.familiaNome}</p>
          <p className={styles.cardMeta}>
            {invite.convidadoPorNome} convidou você como {ROLE_LABELS[invite.papelOferecido]}.
          </p>
          <p className={styles.cardMeta}>Válido até {formatDate(invite.expiraEm)}.</p>
        </div>
      </div>
      <Button fullWidth loading={accept.isPending} disabled={decline.isPending} onClick={() => void respond('accept')}>
        Aceitar convite
      </Button>
      <Button
        variant="secondary"
        fullWidth
        loading={decline.isPending}
        disabled={accept.isPending}
        onClick={() => void respond('decline')}
      >
        Recusar
      </Button>
    </div>
  )
}
