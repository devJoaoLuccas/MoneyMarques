import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import type { z } from 'zod'
import { toApiError } from '../../../shared/lib/api-error'
import { describeApiError } from '../../../shared/lib/form-errors'
import { paths } from '../../../shared/routes/paths'
import { Alert, Button, TextField } from '../../../shared/ui'
import { useForgotPassword } from '../hooks/useAuthMutations'
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../schemas/auth.schemas'
import styles from './AuthForm.module.css'

type ForgotOutput = z.output<typeof forgotPasswordSchema>

/** Mensagem neutra (CA-013): igual exista ou nao uma conta para o e-mail. */
const NEUTRAL_MESSAGE =
  'Se houver uma conta associada a esse e-mail, você receberá instruções para redefinir sua senha.'

/** AUTH-003 (solicitacao). */
export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword()
  const [formError, setFormError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues, unknown, ForgotOutput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async ({ email }) => {
    if (forgotPassword.isPending) return
    setFormError(null)
    try {
      await forgotPassword.mutateAsync(email)
      setSent(true)
    } catch (cause) {
      setFormError(describeApiError(toApiError(cause)))
    }
  })

  if (sent) {
    return (
      <div className={styles.form}>
        <Alert variant="success">{NEUTRAL_MESSAGE}</Alert>
        <Link to={paths.login} className={styles.link}>
          Voltar ao login
        </Link>
      </div>
    )
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && <Alert variant="error">{formError}</Alert>}

      <TextField
        label="E-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register('email')}
      />

      <Button type="submit" fullWidth loading={forgotPassword.isPending}>
        Enviar instruções
      </Button>

      <p className={styles.links}>
        <Link to={paths.login} className={styles.link}>
          Voltar ao login
        </Link>
      </p>
    </form>
  )
}
