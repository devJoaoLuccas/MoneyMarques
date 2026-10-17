import { useId, useState } from 'react'
import { toApiError } from '../../../shared/lib/api-error'
import { describeApiError } from '../../../shared/lib/form-errors'
import { notify } from '../../../shared/lib/toast'
import { Alert, Button, Dialog } from '../../../shared/ui'
import { useChangeRole } from '../hooks/useFamily'
import { ROLE_LABELS } from '../schemas/family.schemas'
import type { FamilyRole, Member } from '../types'
import styles from './FamilyPanels.module.css'

const ROLES: { value: FamilyRole; description: string }[] = [
  { value: 'ADMINISTRADOR', description: 'Gerencia integrantes, convites e as configurações da família.' },
  { value: 'INTEGRANTE', description: 'Administra os próprios lançamentos e os recursos compartilhados autorizados.' },
  { value: 'VISUALIZADOR', description: 'Consulta o que recebeu acesso, sem poder alterar.' },
]

interface EditRoleDialogProps {
  familiaUid: string
  member: Member
  onClose: () => void
}

/**
 * Editar cargo (FAM-003): escolha entre os papeis, com o efeito de cada um. O
 * botao "Salvar cargo" e a confirmacao explicita (inclusive da promocao a
 * administrador, D-FAM-004); regras como "ultimo administrador" vem do servidor.
 */
export function EditRoleDialog({ familiaUid, member, onClose }: EditRoleDialogProps) {
  const groupName = useId()
  const changeRole = useChangeRole(familiaUid)
  const [selected, setSelected] = useState<FamilyRole>(member.papel)
  const [error, setError] = useState<string | null>(null)
  const unchanged = selected === member.papel

  async function save() {
    if (changeRole.isPending || unchanged) return
    setError(null)
    try {
      await changeRole.mutateAsync({ integranteUid: member.uid, papel: selected })
      notify.success(`Cargo de ${member.nome} atualizado para ${ROLE_LABELS[selected]}.`)
      onClose()
    } catch (cause) {
      setError(describeApiError(toApiError(cause)))
    }
  }

  return (
    <Dialog title="Editar cargo" onClose={onClose}>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        {error && <Alert variant="error">{error}</Alert>}
        <fieldset className={styles.roleGroup}>
          <legend className={styles.roleLegend}>Cargo de {member.nome}</legend>
          {ROLES.map(({ value, description }) => (
            <label key={value} className={styles.roleOption}>
              <input
                type="radio"
                name={groupName}
                aria-labelledby={`${groupName}-${value}-nome`}
                aria-describedby={`${groupName}-${value}-descricao`}
                value={value}
                checked={selected === value}
                disabled={changeRole.isPending}
                onChange={() => setSelected(value)}
              />
              <span className={styles.roleText}>
                <span id={`${groupName}-${value}-nome`} className={styles.roleName}>
                  {ROLE_LABELS[value]}
                  {value === member.papel && <span className={styles.badge}>Atual</span>}
                </span>
                <span id={`${groupName}-${value}-descricao`} className={styles.cardMeta}>
                  {description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        {!unchanged && (
          <p className={styles.cardMeta} role="status">
            {member.nome} passará de {ROLE_LABELS[member.papel]} para {ROLE_LABELS[selected]}.
          </p>
        )}
        <div className={styles.cardActions}>
          <Button type="submit" loading={changeRole.isPending} disabled={unchanged}>
            Salvar cargo
          </Button>
          <Button variant="secondary" disabled={changeRole.isPending} onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
