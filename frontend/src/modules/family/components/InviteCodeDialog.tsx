import { useState } from 'react'
import { LuCopy, LuKeyRound } from 'react-icons/lu'
import { toApiError } from '../../../shared/lib/api-error'
import { describeApiError } from '../../../shared/lib/form-errors'
import { notify } from '../../../shared/lib/toast'
import { formatDateTime } from '../../../shared/lib/format-date'
import { Alert, Button, ConfirmDialog, Dialog, LoadingIndicator, SelectField } from '../../../shared/ui'
import { useActiveInviteCode, useIssueInviteCode, useRevokeInviteCode, type ActiveFamily } from '../hooks/useFamily'
import { ROLE_LABELS } from '../schemas/family.schemas'
import type { FamilyRole, InviteCode, IssuedInviteCode } from '../types'
import styles from './FamilyPanels.module.css'

type CodeRole = Exclude<FamilyRole, 'ADMINISTRADOR'>

const ROLE_OPTIONS: { value: CodeRole; label: string }[] = [
  { value: 'INTEGRANTE', label: ROLE_LABELS.INTEGRANTE },
  { value: 'VISUALIZADOR', label: ROLE_LABELS.VISUALIZADOR },
]

interface InviteCodeDialogProps {
  family: ActiveFamily
  /** Codigo ativo da familia (se houver): o modal mostra o codigo; senao, oferece gerar. */
  activeCode: InviteCode | null
  onClose: () => void
  onRevoked: () => void
}

/**
 * Codigo de convite da familia. Um codigo ativo por vez: sem codigo ativo o
 * modal oferece gerar; com codigo ativo, mostra o codigo (copia cifrada no
 * servidor, leitura auditada), a validade e a opcao de revogar.
 */
export function InviteCodeDialog({ family, activeCode, onClose, onRevoked }: InviteCodeDialogProps) {
  const issue = useIssueInviteCode(family.uid)
  const revoke = useRevokeInviteCode(family.uid)
  const [papel, setPapel] = useState<CodeRole>('INTEGRANTE')
  const [issued, setIssued] = useState<IssuedInviteCode | null>(null)
  const [confirmingRevoke, setConfirmingRevoke] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const viewing = activeCode !== null && issued === null
  const active = useActiveInviteCode(family.uid, viewing)
  const shown: IssuedInviteCode | null = issued ?? active.data ?? null
  const hidden = active.isError && toApiError(active.error).code === 'INVITE_CODE_HIDDEN'
  const current = shown ?? activeCode

  async function generate() {
    if (issue.isPending) return
    setError(null)
    try {
      setIssued(await issue.mutateAsync(papel))
    } catch (cause) {
      setError(describeApiError(toApiError(cause)))
    }
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      notify.success('Código copiado.')
    } catch {
      notify.error('Não foi possível copiar. Selecione o código e copie manualmente.')
    }
  }

  async function confirmRevoke() {
    if (!current) return
    setError(null)
    try {
      await revoke.mutateAsync(current.uid)
      onRevoked()
      onClose()
    } catch (cause) {
      setConfirmingRevoke(false)
      setError(describeApiError(toApiError(cause)))
    }
  }

  const title = shown || viewing ? 'Código de convite' : 'Gerar código de convite'

  return (
    <>
      <Dialog title={title} onClose={onClose}>
        {error && <Alert variant="error">{error}</Alert>}

        {shown ? (
          <div className={styles.form}>
            <div className={styles.card} role="status">
              <div className={styles.cardInfo}>
                <p className={styles.cardMeta}>Passe este código a quem vai entrar na família:</p>
                <p className={styles.codeValue} aria-label={`Código ${shown.codigo.split('').join(' ')}`}>
                  {shown.codigo}
                </p>
                <p className={styles.cardMeta}>
                  Entra como {ROLE_LABELS[shown.papel]} · Válido até {formatDateTime(shown.expiraEm)}
                </p>
              </div>
              <div className={styles.cardActions}>
                <Button variant="secondary" onClick={() => void copy(shown.codigo)}>
                  <LuCopy aria-hidden="true" />
                  Copiar código
                </Button>
              </div>
            </div>
            <p className={styles.cardMeta}>
              Vale para uma única pessoa. Quem tiver o código entra na família, então compartilhe só com quem você
              confia.
            </p>
            <div className={styles.cardActions}>
              <Button variant="destructive" onClick={() => setConfirmingRevoke(true)}>
                Revogar código
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        ) : viewing ? (
          <div className={styles.form}>
            {active.isPending && <LoadingIndicator label="Carregando o código" />}
            {active.isError && (
              <Alert variant={hidden ? 'warning' : 'error'}>{describeApiError(toApiError(active.error))}</Alert>
            )}
            {active.isError && (
              <div className={styles.cardActions}>
                {hidden && (
                  <Button variant="destructive" onClick={() => setConfirmingRevoke(true)}>
                    Revogar código
                  </Button>
                )}
                <Button variant="secondary" onClick={onClose}>
                  Fechar
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.form}>
            <p className={styles.cardMeta}>
              Alternativa ao convite por e-mail: o código vale por 24 horas e para uma única pessoa. Quem tiver o código
              entra na família, então compartilhe só com quem você confia.
            </p>
            <SelectField
              label="Papel de quem entrar com o código"
              options={ROLE_OPTIONS}
              value={papel}
              onChange={(event) => setPapel(event.target.value as CodeRole)}
              hint="Administrador só pode ser definido depois, na lista de integrantes."
            />
            <div className={styles.cardActions}>
              <Button loading={issue.isPending} onClick={() => void generate()}>
                <LuKeyRound aria-hidden="true" />
                Gerar código
              </Button>
              <Button variant="secondary" disabled={issue.isPending} onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {confirmingRevoke && (
        <ConfirmDialog
          title="Revogar código"
          confirmLabel="Revogar código"
          destructive
          loading={revoke.isPending}
          onConfirm={() => void confirmRevoke()}
          onCancel={() => setConfirmingRevoke(false)}
        >
          <p>Este código deixará de funcionar. Quem ainda não entrou precisará de um novo.</p>
        </ConfirmDialog>
      )}
    </>
  )
}
