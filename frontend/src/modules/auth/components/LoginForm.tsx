import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { FiArrowRight, FiMail, FiShield, FiUserPlus } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { toApiError } from '../../../shared/lib/api-error'
import { applyFieldErrors, describeApiError } from '../../../shared/lib/form-errors'
import { paths } from '../../../shared/routes/paths'
import { Alert, Button, ButtonLink, Checkbox, PasswordField, TextField } from '../../../shared/ui'
import { useGoToDestination } from '../hooks/useGoToDestination'
import { useLogin } from '../hooks/useAuthMutations'
import { loginSchema, type LoginFormValues } from '../schemas/auth.schemas'
import type { LoginPayload } from '../types'
import styles from './AuthForm.module.css'

/** AUTH-001. Sem regra de negocio: valida UX, chama o servico e segue o destino. */
export function LoginForm() {
  const login = useLogin()
  const goToDestination = useGoToDestination()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues, unknown, LoginPayload>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', senha: '', manterSessao: false },
  })

  const onSubmit = handleSubmit(async (values) => {
    if (login.isPending) return
    setFormError(null)
    try {
      goToDestination(await login.mutateAsync(values))
    } catch (cause) {
      const error = toApiError(cause)
      if (!applyFieldErrors<LoginFormValues>(error, ['email', 'senha'], setError)) {
        setFormError(describeApiError(error))
      }
    }
  })

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && <Alert variant="error">{formError}</Alert>}

      <TextField
        label="E-mail"
        type="email"
        autoComplete="username"
        inputMode="email"
        placeholder="seu@email.com"
        startIcon={<FiMail />}
        error={errors.email?.message}
        {...register('email')}
      />
      <PasswordField
        label="Senha"
        autoComplete="current-password"
        placeholder="Sua senha"
        error={errors.senha?.message}
        {...register('senha')}
      />

      <div className={styles.row}>
        <Checkbox label="Manter sessão" {...register('manterSessao')} />
        <Link to={paths.forgotPassword} className={styles.link}>
          Esqueci minha senha
        </Link>
      </div>

      <Button type="submit" fullWidth loading={login.isPending}>
        Entrar
        <FiArrowRight aria-hidden="true" />
      </Button>

      <p className={styles.divider} aria-hidden="true">
        ou
      </p>

      <ButtonLink to={paths.register} variant="secondary" fullWidth>
        <FiUserPlus aria-hidden="true" />
        Criar conta
      </ButtonLink>

      <p className={styles.secure}>
        <FiShield className={styles.secureIcon} aria-hidden="true" />
        Seus dados estão protegidos com criptografia de nível bancário.
      </p>
    </form>
  )
}
