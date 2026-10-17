import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toApiError } from '../../../shared/lib/api-error'
import { cn } from '../../../shared/lib/cn'
import { describeApiError } from '../../../shared/lib/form-errors'
import { formatDateTime } from '../../../shared/lib/format-date'
import { paths } from '../../../shared/routes/paths'
import { Alert, Button, TextField } from '../../../shared/ui'
import { usePreviewInviteCode, useRedeemInviteCode } from '../hooks/useFamily'
import { ROLE_LABELS } from '../schemas/family.schemas'
import type { InvitePreview } from '../types'
import styles from './FamilyPanels.module.css'

/**
 * Entrar em uma familia com o codigo recebido do administrador (D-FAM-009).
 * Dois passos: confirmar para qual familia (previa, sem consumir) e entrar.
 * O formulario nao valida o codigo: o servidor responde igual a qualquer
 * codigo invalido e limita as tentativas erradas.
 */
export function JoinWithCodeForm() {
  const navigate = useNavigate()
  const preview = usePreviewInviteCode()
  const redeem = useRedeemInviteCode()
  const [codigo, setCodigo] = useState('')
  const [found, setFound] = useState<InvitePreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function checkCode(event: FormEvent) {
    event.preventDefault()
    if (preview.isPending) return
    setError(null)
    if (!codigo.trim()) {
      setError('Informe o código que você recebeu.')
      return
    }
    try {
      setFound(await preview.mutateAsync(codigo))
    } catch (cause) {
      setError(describeApiError(toApiError(cause)))
    }
  }

  async function join() {
    if (redeem.isPending) return
    setError(null)
    try {
      await redeem.mutateAsync(codigo)
      navigate(paths.app, { replace: true })
    } catch (cause) {
      setFound(null)
      setError(describeApiError(toApiError(cause)))
    }
  }

  if (found) {
    return (
      <div className={styles.form}>
        {error && <Alert variant="error">{error}</Alert>}
        <div className={cn(styles.card, styles.cardStacked)}>
          <div className={styles.cardInfo}>
            <p className={styles.cardTitle}>{found.familiaNome}</p>
            <p className={styles.cardMeta}>
              Convite de {found.convidadoPorNome} como {ROLE_LABELS[found.papelOferecido]}. Válido até{' '}
              {formatDateTime(found.expiraEm)}.
            </p>
          </div>
          <div className={styles.cardActions}>
            <Button loading={redeem.isPending} onClick={() => void join()}>
              Entrar na família
            </Button>
            <Button variant="secondary" disabled={redeem.isPending} onClick={() => setFound(null)}>
              Voltar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form className={styles.form} onSubmit={(event) => void checkCode(event)} noValidate>
      {error && <Alert variant="error">{error}</Alert>}
      <TextField
        label="Código de convite"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={12}
        placeholder="XXXX-XXXX"
        hint="Peça o código a um administrador da família."
        value={codigo}
        onChange={(event) => setCodigo(event.target.value.toUpperCase())}
      />
      <Button type="submit" variant="secondary" fullWidth loading={preview.isPending}>
        Continuar
      </Button>
    </form>
  )
}
