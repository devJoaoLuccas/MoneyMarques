import { useDeferredValue, useState } from 'react'
import { LuTrash2 } from 'react-icons/lu'
import { toApiError } from '../../../shared/lib/api-error'
import { describeApiError } from '../../../shared/lib/form-errors'
import { formatDate } from '../../../shared/lib/format-date'
import { Alert, Button, ConfirmDialog, EmptyState, LoadingIndicator, SelectField, TextField } from '../../../shared/ui'
import { useChangeRole, useMembers, useRemoveMember, type ActiveFamily } from '../hooks/useFamily'
import { ROLE_LABELS, ROLE_OPTIONS } from '../schemas/family.schemas'
import type { FamilyRole, Member, MembersQuery } from '../types'
import styles from './FamilyPanels.module.css'

interface MembersPanelProps {
  family: ActiveFamily
}

type PendingAction = { type: 'role'; member: Member; papel: FamilyRole } | { type: 'remove'; member: Member }

const ALL = ''
const ROLE_FILTER = [{ value: ALL, label: 'Todos os papéis' }, ...ROLE_OPTIONS]
const STATUS_FILTER = [
  { value: 'ATIVO', label: 'Ativos' },
  { value: 'REMOVIDO', label: 'Removidos' },
]

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
  const [feedback, setFeedback] = useState<{
    variant: 'success' | 'error'
    message: string
  } | null>(null)

  const deferredNome = useDeferredValue(nome.trim())
  const query: MembersQuery = {
    pagina,
    nome: deferredNome || undefined,
    papel: papel || undefined,
    situacao: isAdmin ? situacao : undefined,
  }
  const members = useMembers(family.uid, query)
  const changeRole = useChangeRole(family.uid)
  const removeMember = useRemoveMember(family.uid)
  const working = changeRole.isPending || removeMember.isPending

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setPagina(1)
      setter(value)
    }
  }

  async function confirm() {
    if (!pending) return
    setFeedback(null)
    try {
      if (pending.type === 'role') {
        await changeRole.mutateAsync({
          integranteUid: pending.member.uid,
          papel: pending.papel,
        })
        setFeedback({
          variant: 'success',
          message: `Papel de ${pending.member.nome} atualizado.`,
        })
      } else {
        await removeMember.mutateAsync(pending.member.uid)
        setFeedback({
          variant: 'success',
          message: `${pending.member.nome} foi removido(a) da família.`,
        })
      }
    } catch (cause) {
      setFeedback({
        variant: 'error',
        message: describeApiError(toApiError(cause)),
      })
    } finally {
      setPending(null)
    }
  }

  const totalPages = members.data ? Math.max(1, Math.ceil(members.data.total / members.data.tamanho)) : 1

  return (
    <div className={styles.form}>
      {feedback && <Alert variant={feedback.variant}>{feedback.message}</Alert>}

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
            <li key={member.uid} className={styles.card}>
              <div className={styles.cardInfo}>
                <p className={styles.cardTitle}>
                  {member.nome}
                  {member.voce && <span className={styles.badge}>Você</span>}
                </p>
                <p className={styles.cardMeta}>{member.email}</p>
                <p className={styles.cardMeta}>
                  {ROLE_LABELS[member.papel]} ·{' '}
                  {member.situacao === 'REMOVIDO' && member.removidoEm
                    ? `Removido em ${formatDate(member.removidoEm)}`
                    : `Desde ${formatDate(member.ingressouEm)}`}
                </p>
              </div>
              {isAdmin && member.situacao === 'ATIVO' && (
                <div className={styles.cardActions}>
                  <SelectField
                    label={`Papel de ${member.nome}`}
                    options={ROLE_OPTIONS}
                    value={member.papel}
                    disabled={working}
                    onChange={(event) =>
                      setPending({
                        type: 'role',
                        member,
                        papel: event.target.value as FamilyRole,
                      })
                    }
                  />
                  <Button
                    variant="destructive"
                    disabled={working}
                    aria-label={`Remover ${member.nome}`}
                    onClick={() => setPending({ type: 'remove', member })}
                  >
                    <LuTrash2 aria-hidden="true" />
                    Remover
                  </Button>
                </div>
              )}
            </li>
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
        <ConfirmDialog
          title="Alterar papel"
          confirmLabel="Confirmar alteração"
          loading={changeRole.isPending}
          onConfirm={() => void confirm()}
          onCancel={() => setPending(null)}
        >
          <p>
            {pending.member.nome} passará de {ROLE_LABELS[pending.member.papel]} para {ROLE_LABELS[pending.papel]}.
            {pending.papel === 'ADMINISTRADOR' &&
              ' Administradores gerenciam integrantes, convites e configurações da família.'}
          </p>
        </ConfirmDialog>
      )}
      {pending?.type === 'remove' && (
        <ConfirmDialog
          title="Remover integrante"
          confirmLabel="Remover da família"
          destructive
          loading={removeMember.isPending}
          onConfirm={() => void confirm()}
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
