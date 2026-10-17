import { useState } from 'react'
import { LuCopy, LuKeyRound } from 'react-icons/lu'
import { toApiError } from '../../../shared/lib/api-error'
import { describeApiError } from '../../../shared/lib/form-errors'
import { formatDateTime } from '../../../shared/lib/format-date'
import { Alert, Button, ConfirmDialog, EmptyState, LoadingIndicator, SelectField } from '../../../shared/ui'
import { useInviteCodes, useIssueInviteCode, useRevokeInviteCode, type ActiveFamily } from '../hooks/useFamily'
import { ROLE_LABELS } from '../schemas/family.schemas'
import type { FamilyRole, InviteCode, InviteCodeStatus, IssuedInviteCode } from '../types'
import styles from './FamilyPanels.module.css'

type CodeRole = Exclude<FamilyRole, 'ADMINISTRADOR'>

const STATUS_LABELS: Record<InviteCodeStatus, string> = {
  ATIVO: 'Ativo',
  USADO: 'Usado',
  REVOGADO: 'Revogado',
  EXPIRADO: 'Expirado',
}

const ROLE_OPTIONS: { value: CodeRole; label: string }[] = [
  { value: 'INTEGRANTE', label: ROLE_LABELS.INTEGRANTE },
  { value: 'VISUALIZADOR', label: ROLE_LABELS.VISUALIZADOR },
]

interface InviteCodesPanelProps {
  family: ActiveFamily
}

/**
 * Codigos de convite (somente administradores): geracao, acompanhamento e
 * revogacao. O codigo em claro so e exibido logo apos gerar; depois so resta o
 * hash no servidor, entao a lista nao consegue mostra-lo de novo.
 */
export function InviteCodesPanel({ family }: InviteCodesPanelProps) {
  const codes = useInviteCodes(family.uid)
  const issue = useIssueInviteCode(family.uid)
  const revoke = useRevokeInviteCode(family.uid)
  const [papel, setPapel] = useState<CodeRole>('INTEGRANTE')
  const [issued, setIssued] = useState<IssuedInviteCode | null>(null)
  const [revoking, setRevoking] = useState<InviteCode | null>(null)
  const [feedback, setFeedback] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  async function generate() {
    if (issue.isPending) return
    setFeedback(null)
    try {
      setIssued(await issue.mutateAsync(papel))
    } catch (cause) {
      setIssued(null)
      setFeedback({ variant: 'error', message: describeApiError(toApiError(cause)) })
    }
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setFeedback({ variant: 'success', message: 'Código copiado.' })
    } catch {
      setFeedback({ variant: 'error', message: 'Não foi possível copiar. Selecione o código e copie manualmente.' })
    }
  }

  async function confirmRevoke() {
    if (!revoking) return
    setFeedback(null)
    try {
      await revoke.mutateAsync(revoking.uid)
      if (issued?.uid === revoking.uid) setIssued(null)
      setFeedback({ variant: 'success', message: 'Código revogado.' })
    } catch (cause) {
      setFeedback({ variant: 'error', message: describeApiError(toApiError(cause)) })
    } finally {
      setRevoking(null)
    }
  }

  return (
    <section className={styles.form} aria-labelledby="codigos-convite-titulo">
      <h2 id="codigos-convite-titulo" className={styles.cardTitle}>
        Código de convite
      </h2>
      <p className={styles.cardMeta}>
        Alternativa ao convite por e-mail: gere um código, passe a quem vai entrar e ele vale por 24 horas e para uma
        única pessoa. Quem tiver o código entra na família, então compartilhe só com quem você confia.
      </p>

      <SelectField
        label="Papel de quem entrar com o código"
        options={ROLE_OPTIONS}
        value={papel}
        onChange={(event) => setPapel(event.target.value as CodeRole)}
        hint="Administrador só pode ser definido depois, na lista de integrantes."
      />
      <Button loading={issue.isPending} onClick={() => void generate()}>
        <LuKeyRound aria-hidden="true" />
        Gerar código
      </Button>

      {issued && (
        <div className={styles.card} role="status">
          <div className={styles.cardInfo}>
            <p className={styles.cardMeta}>Seu código (aparece só agora):</p>
            <p className={styles.codeValue} aria-label={`Código ${issued.codigo.split('').join(' ')}`}>
              {issued.codigo}
            </p>
            <p className={styles.cardMeta}>
              Entra como {ROLE_LABELS[issued.papel]} · Válido até {formatDateTime(issued.expiraEm)}
            </p>
          </div>
          <div className={styles.cardActions}>
            <Button variant="secondary" onClick={() => void copy(issued.codigo)}>
              <LuCopy aria-hidden="true" />
              Copiar código
            </Button>
          </div>
        </div>
      )}

      {feedback && <Alert variant={feedback.variant}>{feedback.message}</Alert>}

      {codes.isPending && <LoadingIndicator label="Carregando códigos" />}
      {codes.isError && (
        <Alert variant="error">
          {describeApiError(toApiError(codes.error))}{' '}
          <button type="button" className={styles.linkButton} onClick={() => void codes.refetch()}>
            Tentar novamente
          </button>
        </Alert>
      )}
      {codes.data && codes.data.length === 0 && <EmptyState title="Nenhum código gerado ainda" />}

      {codes.data && codes.data.length > 0 && (
        <ul className={styles.list} aria-label="Códigos gerados">
          {codes.data.map((code) => (
            <li key={code.uid} className={styles.card}>
              <div className={styles.cardInfo}>
                <p className={styles.cardTitle}>
                  Código de {formatDateTime(code.criadoEm)}
                  <span className={styles.badge}>{STATUS_LABELS[code.situacao]}</span>
                </p>
                <p className={styles.cardMeta}>
                  {ROLE_LABELS[code.papel]}
                  {code.situacao === 'ATIVO' && ` · Válido até ${formatDateTime(code.expiraEm)}`}
                  {code.usadoEm && ` · Usado em ${formatDateTime(code.usadoEm)}`}
                </p>
              </div>
              {code.situacao === 'ATIVO' && (
                <div className={styles.cardActions}>
                  <Button
                    variant="destructive"
                    aria-label={`Revogar código de ${formatDateTime(code.criadoEm)}`}
                    onClick={() => setRevoking(code)}
                  >
                    Revogar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {revoking && (
        <ConfirmDialog
          title="Revogar código"
          confirmLabel="Revogar código"
          destructive
          loading={revoke.isPending}
          onConfirm={() => void confirmRevoke()}
          onCancel={() => setRevoking(null)}
        >
          <p>Este código deixará de funcionar. Quem ainda não entrou precisará de um novo.</p>
        </ConfirmDialog>
      )}
    </section>
  )
}
