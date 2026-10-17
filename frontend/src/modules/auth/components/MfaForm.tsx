import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import type { z } from 'zod'
import { toApiError } from '../../../shared/lib/api-error'
import { describeApiError } from '../../../shared/lib/form-errors'
import { paths } from '../../../shared/routes/paths'
import { Alert, Button, TextField } from '../../../shared/ui'
import { useLogout, useVerifyMfa } from '../hooks/useAuthMutations'
import { useGoToDestination } from '../hooks/useGoToDestination'
import { mfaSchema, type MfaFormValues } from '../schemas/auth.schemas'
import styles from './AuthForm.module.css'

type MfaOutput = z.output<typeof mfaSchema>
type Mode = MfaFormValues['modo']

const COPY: Record<Mode, { label: string; toggle: string }> = {
  totp: { label: 'Código de verificação', toggle: 'Usar código de recuperação' },
  recuperacao: { label: 'Código de recuperação', toggle: 'Usar código do aplicativo' },
}

/** AUTH-004: segundo fator (TOTP) ou codigo de recuperacao de uso unico. */
export function MfaForm() {
  const verifyMfa = useVerifyMfa()
  const logout = useLogout()
  const navigate = useNavigate()
  const goToDestination = useGoToDestination()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    control,
    formState: { errors },
  } = useForm<MfaFormValues, unknown, MfaOutput>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { modo: 'totp', codigo: '' },
  })

  const mode = useWatch({ control, name: 'modo' })
  const isTotp = mode === 'totp'

  function toggleMode() {
    setValue('modo', isTotp ? 'recuperacao' : 'totp')
    setValue('codigo', '')
    clearErrors()
    setFormError(null)
  }

  const onSubmit = handleSubmit(async (values) => {
    if (verifyMfa.isPending) return
    setFormError(null)
    try {
      goToDestination(await verifyMfa.mutateAsync(values))
    } catch (cause) {
      setFormError(describeApiError(toApiError(cause)))
    }
  })

  function backToLogin() {
    logout.mutate(undefined, { onSettled: () => navigate(paths.login, { replace: true }) })
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && <Alert variant="error">{formError}</Alert>}

      <TextField
        label={COPY[mode].label}
        autoComplete={isTotp ? 'one-time-code' : 'off'}
        inputMode={isTotp ? 'numeric' : 'text'}
        autoCapitalize={isTotp ? undefined : 'characters'}
        spellCheck={false}
        hint={isTotp ? 'Informe os 6 dígitos do seu aplicativo autenticador.' : 'Cada código só pode ser usado uma vez.'}
        error={errors.codigo?.message}
        {...register('codigo')}
      />

      <Button type="submit" fullWidth loading={verifyMfa.isPending}>
        Verificar
      </Button>

      <div className={styles.links}>
        <Button variant="ghost" onClick={toggleMode}>
          {COPY[mode].toggle}
        </Button>
        <Button variant="ghost" onClick={backToLogin} loading={logout.isPending}>
          Voltar ao login
        </Button>
      </div>
    </form>
  )
}
