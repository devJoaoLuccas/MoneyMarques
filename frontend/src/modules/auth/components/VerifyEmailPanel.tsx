import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toApiError } from '../../../shared/lib/api-error'
import { describeApiError } from '../../../shared/lib/form-errors'
import { paths } from '../../../shared/routes/paths'
import { Alert, Button, LoadingIndicator } from '../../../shared/ui'
import { useLogout, useResendVerification, useVerifyEmail } from '../hooks/useAuthMutations'
import { useSession } from '../hooks/useSession'
import { readTokenFromHash } from '../navigation/url-token'
import { resolveDestination } from '../navigation/resolve-destination'
import { getSelectedFamily } from '../state/selected-family'
import styles from './AuthForm.module.css'

const LoginLink = () => (
  <Link to={paths.login} className={styles.link}>
    Ir para o login
  </Link>
)

/** RN-AUTH-009: confirma o e-mail pelo link (#token=) ou orienta quem tem e-mail pendente. */
export function VerifyEmailPanel() {
  const location = useLocation()
  const navigate = useNavigate()
  const [token] = useState(() => readTokenFromHash(location.hash))
  const verifyEmail = useVerifyEmail()
  const started = useRef(false)

  useEffect(() => {
    if (location.hash) navigate({ hash: '' }, { replace: true })
  }, [location.hash, navigate])

  useEffect(() => {
    // Uma unica tentativa: o token e de uso unico (inclusive sob StrictMode).
    if (token && !started.current) {
      started.current = true
      verifyEmail.mutate(token)
    }
  }, [token, verifyEmail])

  if (token) {
    if (verifyEmail.isError) {
      return (
        <div className={styles.form}>
          <Alert variant="error">{describeApiError(toApiError(verifyEmail.error))}</Alert>
          <LoginLink />
        </div>
      )
    }
    if (verifyEmail.isSuccess) {
      return (
        <div className={styles.form}>
          <Alert variant="success" title="E-mail confirmado">
            Seu e-mail foi confirmado. Entre para continuar.
          </Alert>
          <LoginLink />
        </div>
      )
    }
    return <LoadingIndicator label="Confirmando seu e-mail" />
  }

  return <PendingEmailPanel />
}

/** Sem token no link: depende da sessao (e-mail pendente, sem sessao ou ja liberada). */
function PendingEmailPanel() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const resend = useResendVerification()
  const logout = useLogout()
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (isPending) return <LoadingIndicator label="Verificando sessão" />
  if (!session || session.status === 'authenticated' || session.status === 'mfa_required') {
    return <Navigate to={resolveDestination(session ?? { status: 'auth_required' }, getSelectedFamily())} replace />
  }

  if (session.status === 'auth_required') {
    return (
      <div className={styles.form}>
        <p>Abra o link enviado ao seu e-mail para confirmar o cadastro. Se já confirmou, entre na sua conta.</p>
        <LoginLink />
      </div>
    )
  }

  async function onResend() {
    setNotice(null)
    setError(null)
    try {
      await resend.mutateAsync()
      setNotice('Enviamos um novo link para o seu e-mail.')
    } catch (cause) {
      setError(describeApiError(toApiError(cause)))
    }
  }

  return (
    <div className={styles.form}>
      <p>
        Enviamos um link de confirmação para <strong>{session.usuario.email}</strong>. Abra a mensagem para liberar o
        acesso à sua conta.
      </p>
      {notice && <Alert variant="success">{notice}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
      <Button fullWidth loading={resend.isPending} onClick={() => void onResend()}>
        Reenviar e-mail
      </Button>
      <Button
        variant="ghost"
        loading={logout.isPending}
        onClick={() => logout.mutate(undefined, { onSettled: () => navigate(paths.login, { replace: true }) })}
      >
        Sair
      </Button>
    </div>
  )
}
