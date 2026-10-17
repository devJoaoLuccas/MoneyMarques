import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { LuMail, LuSend } from 'react-icons/lu'
import { toApiError } from '../../../shared/lib/api-error'
import { applyFieldErrors, describeApiError } from '../../../shared/lib/form-errors'
import { Alert, Button, Dialog, SelectField, TextField } from '../../../shared/ui'
import { useIssueInvite, type ActiveFamily } from '../hooks/useFamily'
import { inviteSchema, ROLE_OPTIONS, type InviteFormValues, type InvitePayload } from '../schemas/family.schemas'
import styles from './FamilyPanels.module.css'

interface InviteFormDialogProps {
  family: ActiveFamily
  onClose: () => void
  /** Chamado apos o envio, com o e-mail convidado. */
  onSent: (email: string) => void
}

const FIELDS = ['email', 'papel'] as const

/** FAM-005: enviar convite por e-mail. */
export function InviteFormDialog({ family, onClose, onSent }: InviteFormDialogProps) {
  const issue = useIssueInvite(family.uid)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<InviteFormValues, unknown, InvitePayload>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', papel: 'INTEGRANTE' },
  })

  const onSubmit = handleSubmit(async (values) => {
    if (issue.isPending) return
    setFormError(null)
    try {
      await issue.mutateAsync(values)
      onSent(values.email)
      onClose()
    } catch (cause) {
      const error = toApiError(cause)
      if (!applyFieldErrors<InviteFormValues>(error, FIELDS, setError)) setFormError(describeApiError(error))
    }
  })

  return (
    <Dialog title="Enviar convite" onClose={onClose}>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <p className={styles.cardMeta}>
          A pessoa recebe um link por e-mail, válido por 7 dias, para entrar na família {family.nome}.
        </p>
        {formError && <Alert variant="error">{formError}</Alert>}
        <TextField
          label="E-mail da pessoa"
          type="email"
          inputMode="email"
          autoComplete="off"
          startIcon={<LuMail />}
          error={errors.email?.message}
          {...register('email')}
        />
        <SelectField
          label="Papel na família"
          options={ROLE_OPTIONS}
          error={errors.papel?.message}
          {...register('papel')}
        />
        <div className={styles.cardActions}>
          <Button type="submit" loading={issue.isPending}>
            <LuSend aria-hidden="true" />
            Enviar convite
          </Button>
          <Button variant="secondary" disabled={issue.isPending} onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
