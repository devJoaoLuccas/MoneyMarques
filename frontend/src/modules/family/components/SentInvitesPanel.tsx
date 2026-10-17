import { useState } from 'react'
import { LuKeyRound, LuUserPlus } from 'react-icons/lu'
import { toApiError } from '../../../shared/lib/api-error'
import { describeApiError } from '../../../shared/lib/form-errors'
import { formatDate } from '../../../shared/lib/format-date'
import { Alert, Button, ConfirmDialog, EmptyState, LoadingIndicator, SelectField } from '../../../shared/ui'
import { useInviteCodes, useInvites, useResendInvite, useRevokeInvite, type ActiveFamily } from '../hooks/useFamily'
import { ROLE_LABELS } from '../schemas/family.schemas'
import type { Invite, InviteStatus } from '../types'
import { InviteCodeDialog } from './InviteCodeDialog'
import { InviteFormDialog } from './InviteFormDialog'
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

type Modal = 'convite' | 'codigo' | null

/**
 * FAM-005 / D-FAM-009: convites enviados, com as acoes "Enviar convite" e
 * "Gerar codigo" (ou "Visualizar codigo", se ja existe um codigo ativo) na
 * mesma linha do titulo. Somente administradores (o servidor tambem exige).
 */
export function SentInvitesPanel({ family }: SentInvitesPanelProps) {
  const [pagina, setPagina] = useState(1)
  const [situacao, setSituacao] = useState<InviteStatus | ''>('')
  const [revoking, setRevoking] = useState<Invite | null>(null)
  const [modal, setModal] = useState<Modal>(null)
  const [feedback, setFeedback] = useState<{
    variant: 'success' | 'error'
    message: string
  } | null>(null)

  const invites = useInvites(family.uid, {
    pagina,
    situacao: situacao || undefined,
  })
  const codes = useInviteCodes(family.uid)
  const revoke = useRevokeInvite(family.uid)
  const resend = useResendInvite(family.uid)

  const activeCode = codes.data?.find((code) => code.situacao === 'ATIVO') ?? null

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
    <section className={styles.form} aria-labelledby="convites-enviados-titulo">
      <div className={styles.sectionHeader}>
        <h2 id="convites-enviados-titulo" className={styles.sectionTitle}>
          Convites enviados
        </h2>
        <div className={styles.cardActions}>
          <Button onClick={() => setModal('convite')}>
            <LuUserPlus aria-hidden="true" />
            Enviar convite
          </Button>
          <Button variant="secondary" disabled={codes.isPending} onClick={() => setModal('codigo')}>
            <LuKeyRound aria-hidden="true" />
            {activeCode ? 'Visualizar código' : 'Gerar código'}
          </Button>
        </div>
      </div>

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
          Envie um convite por e-mail ou gere um código para começar a compartilhar a família.
        </EmptyState>
      )}

      {invites.data && invites.data.itens.length > 0 && (
        <ul className={styles.list}>
          {invites.data.itens.map((invite) => (
            <li key={invite.uid} className={styles.card}>
              <div className={styles.cardInfo}>
                <p className={styles.cardTitle}>
                  {invite.origem === 'codigo' ? (invite.nome ?? invite.email) : invite.email}
                  <span className={styles.badge}>{STATUS_LABELS[invite.situacao]}</span>
                  {invite.origem === 'codigo' && <span className={styles.badge}>Por código</span>}
                </p>
                <p className={styles.cardMeta}>
                  {invite.origem === 'codigo' ? (
                    <>
                      {invite.nome && `${invite.email} · `}
                      {ROLE_LABELS[invite.papel]} · Código gerado em {formatDate(invite.criadoEm)}
                      {invite.respondidoEm && ` · Entrou em ${formatDate(invite.respondidoEm)}`}
                    </>
                  ) : (
                    <>
                      {ROLE_LABELS[invite.papel]} · Enviado em {formatDate(invite.criadoEm)}
                      {invite.situacao === 'PENDENTE' && ` · Válido até ${formatDate(invite.expiraEm)}`}
                    </>
                  )}
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

      {modal === 'convite' && (
        <InviteFormDialog
          family={family}
          onClose={() => setModal(null)}
          onSent={(email) => setFeedback({ variant: 'success', message: `Convite enviado para ${email}.` })}
        />
      )}
      {modal === 'codigo' && (
        <InviteCodeDialog
          family={family}
          activeCode={activeCode}
          onClose={() => setModal(null)}
          onRevoked={() => setFeedback({ variant: 'success', message: 'Código revogado.' })}
        />
      )}
    </section>
  )
}
