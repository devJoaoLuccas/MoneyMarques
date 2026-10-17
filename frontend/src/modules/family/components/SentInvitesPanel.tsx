import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { LuMail, LuUserPlus } from 'react-icons/lu'
import { toApiError } from '../../../shared/lib/api-error'
import { applyFieldErrors, describeApiError } from '../../../shared/lib/form-errors'
import { formatDate } from '../../../shared/lib/format-date'
import { Alert, Button, ConfirmDialog, EmptyState, LoadingIndicator, SelectField, TextField } from '../../../shared/ui'
import { useInvites, useIssueInvite, useResendInvite, useRevokeInvite, type ActiveFamily } from '../hooks/useFamily'
import {
  inviteSchema,
  ROLE_LABELS,
  ROLE_OPTIONS,
  type InviteFormValues,
  type InvitePayload,
} from '../schemas/family.schemas'
import type { Invite, InviteStatus } from '../types'
import styles from './FamilyPanels.module.css'

interface SentInvitesPanelProps {
  family: ActiveFamily
}

const STATUS_LABELS: Record<InviteStatus, string> = {
  PENDENTE: 'Pendente',
  ACEITO: 'Aceito',
  RECUSADO: 'Recusado',
  EXPIRADO: 'Expirado',
  REVOGADO: 'Revogado',
}

const STATUS_FILTER = [
  { value: '', label: 'Todas as situações' },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
]

const FIELDS = ['email', 'papel'] as const

/** FAM-005: emissao, acompanhamento, reenvio e revogacao de convites (somente administradores). */
export function SentInvitesPanel({ family }: SentInvitesPanelProps) {
  const [pagina, setPagina] = useState(1)
  const [situacao, setSituacao] = useState<InviteStatus | ''>('')
  const [revoking, setRevoking] = useState<Invite | null>(null)
  const [feedback, setFeedback] = useState<{
    variant: 'success' | 'error'
    message: string
  } | null>(null)

  const invites = useInvites(family.uid, {
    pagina,
    situacao: situacao || undefined,
  })
  const issue = useIssueInvite(family.uid)
  const revoke = useRevokeInvite(family.uid)
  const resend = useResendInvite(family.uid)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<InviteFormValues, unknown, InvitePayload>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', papel: 'INTEGRANTE' },
  })

  const onSubmit = handleSubmit(async (values) => {
    if (issue.isPending) return
    setFeedback(null)
    try {
      await issue.mutateAsync(values)
      setFeedback({
        variant: 'success',
        message: `Convite enviado para ${values.email}.`,
      })
      reset({ email: '', papel: values.papel })
    } catch (cause) {
      const error = toApiError(cause)
      if (!applyFieldErrors<InviteFormValues>(error, FIELDS, setError)) {
        setFeedback({ variant: 'error', message: describeApiError(error) })
      }
    }
  })

  async function resendInvite(invite: Invite) {
    setFeedback(null)
    try {
      await resend.mutateAsync(invite.uid)
      setFeedback({
        variant: 'success',
        message: `Convite reenviado para ${invite.email}. O link anterior foi invalidado.`,
      })
    } catch (cause) {
      setFeedback({
        variant: 'error',
        message: describeApiError(toApiError(cause)),
      })
    }
  }

  async function confirmRevoke() {
    if (!revoking) return
    setFeedback(null)
    try {
      await revoke.mutateAsync(revoking.uid)
      setFeedback({
        variant: 'success',
        message: `Convite para ${revoking.email} revogado.`,
      })
    } catch (cause) {
      setFeedback({
        variant: 'error',
        message: describeApiError(toApiError(cause)),
      })
    } finally {
      setRevoking(null)
    }
  }

  const totalPages = invites.data ? Math.max(1, Math.ceil(invites.data.total / invites.data.tamanho)) : 1

  return (
    <div className={styles.form}>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
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
        <Button type="submit" loading={issue.isPending}>
          <LuUserPlus aria-hidden="true" />
          Enviar convite
        </Button>
      </form>

      {feedback && <Alert variant={feedback.variant}>{feedback.message}</Alert>}

      <SelectField
        label="Filtrar convites"
        options={STATUS_FILTER}
        value={situacao}
        onChange={(event) => {
          setPagina(1)
          setSituacao(event.target.value as InviteStatus | '')
        }}
      />

      {invites.isPending && <LoadingIndicator label="Carregando convites" />}
      {invites.isError && (
        <Alert variant="error">
          {describeApiError(toApiError(invites.error))}{' '}
          <button type="button" className={styles.linkButton} onClick={() => void invites.refetch()}>
            Tentar novamente
          </button>
        </Alert>
      )}

      {invites.data && invites.data.itens.length === 0 && (
        <EmptyState title="Nenhum convite por aqui">
          Convide alguém pelo e-mail para começar a compartilhar a família.
        </EmptyState>
      )}

      {invites.data && invites.data.itens.length > 0 && (
        <ul className={styles.list}>
          {invites.data.itens.map((invite) => (
            <li key={invite.uid} className={styles.card}>
              <div className={styles.cardInfo}>
                <p className={styles.cardTitle}>
                  {invite.email}
                  <span className={styles.badge}>{STATUS_LABELS[invite.situacao]}</span>
                </p>
                <p className={styles.cardMeta}>
                  {ROLE_LABELS[invite.papel]} · Enviado em {formatDate(invite.criadoEm)}
                  {invite.situacao === 'PENDENTE' && ` · Válido até ${formatDate(invite.expiraEm)}`}
                </p>
              </div>
              {invite.situacao === 'PENDENTE' && (
                <div className={styles.cardActions}>
                  <Button
                    variant="secondary"
                    disabled={resend.isPending}
                    aria-label={`Reenviar convite para ${invite.email}`}
                    onClick={() => void resendInvite(invite)}
                  >
                    Reenviar
                  </Button>
                  <Button
                    variant="destructive"
                    aria-label={`Revogar convite para ${invite.email}`}
                    onClick={() => setRevoking(invite)}
                  >
                    Revogar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {invites.data && invites.data.total > invites.data.tamanho && (
        <div className={styles.pagination}>
          <Button variant="secondary" disabled={pagina <= 1} onClick={() => setPagina((current) => current - 1)}>
            Anterior
          </Button>
          <span aria-live="polite">
            Página {pagina} de {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={pagina >= totalPages}
            onClick={() => setPagina((current) => current + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      {revoking && (
        <ConfirmDialog
          title="Revogar convite"
          confirmLabel="Revogar convite"
          destructive
          loading={revoke.isPending}
          onConfirm={() => void confirmRevoke()}
          onCancel={() => setRevoking(null)}
        >
          <p>O link enviado para {revoking.email} deixará de funcionar. Você poderá enviar um novo convite depois.</p>
        </ConfirmDialog>
      )}
    </div>
  )
}
