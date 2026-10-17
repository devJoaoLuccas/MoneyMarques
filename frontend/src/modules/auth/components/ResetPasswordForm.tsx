import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { z } from 'zod'
import { toApiError } from '../../../shared/lib/api-error'
import { applyFieldErrors, describeApiError } from '../../../shared/lib/form-errors'
import { paths } from '../../../shared/routes/paths'
import { Alert, Button, PasswordField } from '../../../shared/ui'
import { useResetPassword } from '../hooks/useAuthMutations'
import { readTokenFromHash } from '../navigation/url-token'
import { PASSWORD_HINT, resetPasswordSchema, type ResetPasswordFormValues } from '../schemas/auth.schemas'
import styles from './AuthForm.module.css'

type ResetOutput = z.output<typeof resetPasswordSchema>

const INVALID_LINK_MESSAGE = 'Este link é inválido ou expirou. Solicite um novo.'

/** AUTH-003 (redefinicao). Remove o token do endereco assim que o le. */
export function ResetPasswordForm() {
  const location = useLocation()
  const navigate = useNavigate()
  const resetPassword = useResetPassword()
  const [token] = useState(() => readTokenFromHash(location.hash))
  const [tokenRejected, setTokenRejected] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (location.hash) navigate({ hash: '' }, { replace: true })
  }, [location.hash, navigate])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordFormValues, unknown, ResetOutput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { senha: '', confirmarSenha: '' },
  })

  const onSubmit = handleSubmit(async ({ senha }) => {
    if (!token || resetPassword.isPending) return
    setFormError(null)
    try {
      await resetPassword.mutateAsync({ token, senha })
      setDone(true)
    } catch (cause) {
      const error = toApiError(cause)
      if (error.code === 'INVALID_TOKEN') {
        setTokenRejected(true)
      } else if (!applyFieldErrors<ResetPasswordFormValues>(error, ['senha', 'confirmarSenha'], setError)) {
        setFormError(describeApiError(error))
      }
    }
  })

  if (done) {
    return (
      <div className={styles.form}>
        <Alert variant="success" title="Senha alterada">
          Sua senha foi redefinida e as outras sessões foram encerradas. Entre com a nova senha.
        </Alert>
        <Link to={paths.login} className={styles.link}>
          Ir para o login
        </Link>
      </div>
    )
  }

  if (!token || tokenRejected) {
    return (
      <div className={styles.form}>
        <Alert variant="error">{INVALID_LINK_MESSAGE}</Alert>
        <Link to={paths.forgotPassword} className={styles.link}>
          Solicitar novo link
        </Link>
      </div>
    )
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && <Alert variant="error">{formError}</Alert>}

      <PasswordField
        label="Nova senha"
        autoComplete="new-password"
        hint={PASSWORD_HINT}
        error={errors.senha?.message}
        {...register('senha')}
      />
      <PasswordField
        label="Confirmar nova senha"
        autoComplete="new-password"
        error={errors.confirmarSenha?.message}
        {...register('confirmarSenha')}
      />

      <Button type="submit" fullWidth loading={resetPassword.isPending}>
        Redefinir senha
      </Button>
    </form>
  )
}
