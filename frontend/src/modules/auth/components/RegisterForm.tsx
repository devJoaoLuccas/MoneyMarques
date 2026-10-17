import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'
import type { z } from 'zod'
import { toApiError } from '../../../shared/lib/api-error'
import { applyFieldErrors, describeApiError } from '../../../shared/lib/form-errors'
import { paths } from '../../../shared/routes/paths'
import { Alert, Button, Checkbox, PasswordField, TextField } from '../../../shared/ui'
import { useRegister } from '../hooks/useAuthMutations'
import { registerSchema, type RegisterFormValues } from '../schemas/auth.schemas'
import styles from './AuthForm.module.css'
import { PasswordRequirements } from './PasswordRequirements'

type RegisterOutput = z.output<typeof registerSchema>

const FIELDS = ['nomeCompleto', 'email', 'senha', 'confirmarSenha', 'aceiteTermos'] as const

/** AUTH-002. Resposta neutra: nao informa se o e-mail ja tinha conta (CA-009). */
export function RegisterForm() {
  const registerUser = useRegister()
  const [formError, setFormError] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<RegisterFormValues, unknown, RegisterOutput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { nomeCompleto: '', email: '', senha: '', confirmarSenha: '', aceiteTermos: false },
  })

  const senha = useWatch({ control, name: 'senha' })

  const onSubmit = handleSubmit(async (values) => {
    if (registerUser.isPending) return
    setFormError(null)
    try {
      await registerUser.mutateAsync(values)
      setSubmittedEmail(values.email)
    } catch (cause) {
      const error = toApiError(cause)
      if (!applyFieldErrors<RegisterFormValues>(error, FIELDS, setError)) {
        setFormError(describeApiError(error))
      }
    }
  })

  if (submittedEmail) {
    return (
      <div className={styles.form}>
        <Alert variant="success" title="Confira seu e-mail">
          Enviamos instruções para {submittedEmail}. Abra a mensagem e confirme seu e-mail para ativar a conta.
        </Alert>
        <Link to={paths.login} className={styles.link}>
          Ir para o login
        </Link>
      </div>
    )
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && <Alert variant="error">{formError}</Alert>}

      <TextField
        label="Nome completo"
        autoComplete="name"
        error={errors.nomeCompleto?.message}
        {...register('nomeCompleto')}
      />
      <TextField
        label="E-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <PasswordField
        label="Senha"
        autoComplete="new-password"
        error={errors.senha?.message}
        {...register('senha')}
      />
      <PasswordRequirements value={senha} />
      <PasswordField
        label="Confirmar senha"
        autoComplete="new-password"
        error={errors.confirmarSenha?.message}
        {...register('confirmarSenha')}
      />
      <Checkbox
        label={
          <>
            Li e aceito os{' '}
            <a href="/termos" target="_blank" rel="noreferrer">
              Termos de Uso
            </a>{' '}
            e a{' '}
            <a href="/privacidade" target="_blank" rel="noreferrer">
              Política de Privacidade
            </a>
            .
          </>
        }
        error={errors.aceiteTermos?.message}
        {...register('aceiteTermos')}
      />

      <Button type="submit" fullWidth loading={registerUser.isPending}>
        Criar conta
      </Button>

      <p className={styles.links}>
        <span>Já tem uma conta?</span>
        <Link to={paths.login} className={styles.link}>
          Entrar
        </Link>
      </p>
    </form>
  )
}
