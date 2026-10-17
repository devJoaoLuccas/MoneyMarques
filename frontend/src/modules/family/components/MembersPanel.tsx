import { useDeferredValue, useState } from 'react'
import { toApiError } from '../../../shared/lib/api-error'
import { describeApiError } from '../../../shared/lib/form-errors'
import { notify } from '../../../shared/lib/toast'
import { formatDate } from '../../../shared/lib/format-date'
import {
  ActionMenu,
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  LoadingIndicator,
  SelectField,
  TextField,
} from '../../../shared/ui'
import { useMembers, useRemoveMember, type ActiveFamily } from '../hooks/useFamily'
import { ROLE_LABELS, ROLE_OPTIONS } from '../schemas/family.schemas'
import { EditRoleDialog } from './EditRoleDialog'
import type { FamilyRole, Member, MembersQuery } from '../types'
import styles from './FamilyPanels.module.css'

interface MembersPanelProps {
  family: ActiveFamily
}

type PendingAction = { type: 'role'; member: Member } | { type: 'remove'; member: Member }

const ALL = ''
const ROLE_FILTER = [{ value: ALL, label: 'Todos os papéis' }, ...ROLE_OPTIONS]
const STATUS_FILTER = [
  { value: 'ATIVO', label: 'Ativos' },
  { value: 'REMOVIDO', label: 'Removidos' },
]

/** Nome, e-mail e papel do integrante; `inline` troca <p> por <span> (conteudo de um botao so aceita texto em linha). */
function MemberSummary({ member, inline }: { member: Member; inline: boolean }) {
  const Tag = inline ? 'span' : 'p'
  return (
    <>
      <Tag className={styles.cardTitle}>
        {member.nome}
        {member.voce && <span className={styles.badge}>Você</span>}
      </Tag>
      <Tag className={styles.cardMeta}>{member.email}</Tag>
      <Tag className={styles.cardMeta}>
        {ROLE_LABELS[member.papel]} ·{' '}
        {member.situacao === 'REMOVIDO' && member.removidoEm
          ? `Removido em ${formatDate(member.removidoEm)}`
          : `Desde ${formatDate(member.ingressouEm)}`}
      </Tag>
    </>
  )
}

interface MemberItemProps {
  member: Member
  /** Administrador gerenciando um integrante ativo: o card abre o menu de acoes. */
  canManage: boolean
  disabled: boolean
  onEditRole: () => void
  onRemove: () => void
}

/**
 * Para administradores, o card de um integrante ativo abre um menu com as
 * edicao de cargo e a remocao. Os demais cards nao sao clicaveis.
 */
function MemberItem({ member, canManage, disabled, onEditRole, onRemove }: MemberItemProps) {
  if (!canManage) {
    return (
      <li className={styles.card}>
        <div className={styles.cardInfo}>
          <MemberSummary member={member} inline={false} />
        </div>
      </li>
    )
  }
  return (
    <li>
      <ActionMenu
        menuLabel={`Ações para ${member.nome}`}
        triggerClassName={styles.cardTrigger}
        items={[
          { label: 'Editar cargo', onSelect: onEditRole, disabled },
          { label: 'Remover da família', onSelect: onRemove, destructive: true, disabled },
        ]}
      >
        <MemberSummary member={member} inline />
      </ActionMenu>
    </li>
  )
}

/**
 * FAM-003: integrantes. Controles administrativos so aparecem para o
 * administrador (CA-FAM-007), mas a autorizacao real e do servidor; toda
 * alteracao de papel ou remocao pede confirmacao explicita.
 */
export function MembersPanel({ family }: MembersPanelProps) {
  const isAdmin = family.papel === 'ADMINISTRADOR'
  const [pagina, setPagina] = useState(1)
  const [nome, setNome] = useState('')
  const [papel, setPapel] = useState<FamilyRole | typeof ALL>(ALL)
  const [situacao, setSituacao] = useState<'ATIVO' | 'REMOVIDO'>('ATIVO')
  const [pending, setPending] = useState<PendingAction | null>(null)

  const deferredNome = useDeferredValue(nome.trim())
  const query: MembersQuery = {
    pagina,
    nome: deferredNome || undefined,
    papel: papel || undefined,
    situacao: isAdmin ? situacao : undefined,
  }
  const members = useMembers(family.uid, query)
  const removeMember = useRemoveMember(family.uid)
  const working = removeMember.isPending

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setPagina(1)
      setter(value)
    }
  }

  async function confirmRemove() {
    if (pending?.type !== 'remove') return
    try {
      await removeMember.mutateAsync(pending.member.uid)
      notify.success(`${pending.member.nome} foi removido(a) da família.`)
    } catch (cause) {
      notify.error(describeApiError(toApiError(cause)))
    } finally {
      setPending(null)
    }
  }

  const totalPages = members.data ? Math.max(1, Math.ceil(members.data.total / members.data.tamanho)) : 1

  return (
    <div className={styles.form}>
      <div className={styles.filters}>
        <TextField
          label="Buscar por nome"
          type="search"
          autoComplete="off"
          value={nome}
          onChange={(event) => resetPage(setNome)(event.target.value)}
        />
        <SelectField
          label="Papel"
          options={ROLE_FILTER}
          value={papel}
          onChange={(event) => resetPage(setPapel)(event.target.value as FamilyRole | typeof ALL)}
        />
        {isAdmin && (
          <SelectField
            label="Situação"
            options={STATUS_FILTER}
            value={situacao}
            onChange={(event) => resetPage(setSituacao)(event.target.value as 'ATIVO' | 'REMOVIDO')}
          />
        )}
      </div>

      {members.isPending && <LoadingIndicator label="Carregando integrantes" />}
      {members.isError && (
        <Alert variant="error">
          {describeApiError(toApiError(members.error))}{' '}
          <button type="button" className={styles.linkButton} onClick={() => void members.refetch()}>
            Tentar novamente
          </button>
        </Alert>
      )}

      {members.data && members.data.itens.length === 0 && (
        <EmptyState title="Nenhum integrante encontrado">
          Ajuste os filtros para ver outras pessoas da família.
        </EmptyState>
      )}

      {members.data && members.data.itens.length > 0 && (
        <ul className={styles.list}>
          {members.data.itens.map((member) => (
            <MemberItem
              key={member.uid}
              member={member}
              canManage={isAdmin && member.situacao === 'ATIVO'}
              disabled={working}
              onEditRole={() => setPending({ type: 'role', member })}
              onRemove={() => setPending({ type: 'remove', member })}
            />
          ))}
        </ul>
      )}

      {members.data && members.data.total > members.data.tamanho && (
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

      {pending?.type === 'role' && (
        <EditRoleDialog familiaUid={family.uid} member={pending.member} onClose={() => setPending(null)} />
      )}
      {pending?.type === 'remove' && (
        <ConfirmDialog
          title="Remover integrante"
          confirmLabel="Remover da família"
          destructive
          loading={removeMember.isPending}
          onConfirm={() => void confirmRemove()}
          onCancel={() => setPending(null)}
        >
          <p>
            {pending.member.nome} perderá o acesso à família imediatamente. O histórico é preservado e a pessoa poderá
            ser convidada novamente.
          </p>
        </ConfirmDialog>
      )}
    </div>
  )
}
