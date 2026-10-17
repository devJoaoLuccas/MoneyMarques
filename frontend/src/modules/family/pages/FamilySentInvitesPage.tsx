import { PaginaAutenticada } from '../../../shared/layouts/PaginaAutenticada/PaginaAutenticada'
import { Alert } from '../../../shared/ui'
import { SentInvitesPanel } from '../components/SentInvitesPanel'
import { useActiveFamily } from '../hooks/useFamily'

/** FAM-005: convites da familia ativa. Somente administradores (o servidor tambem exige). */
export function FamilySentInvitesPage() {
  const family = useActiveFamily()
  if (!family) return null

  return (
    <PaginaAutenticada title="Convites" subtitle="Convide pessoas por e-mail ou por código e acompanhe as respostas.">
      {family.papel === 'ADMINISTRADOR' ? (
        <SentInvitesPanel family={family} />
      ) : (
        <Alert variant="warning">Apenas administradores podem gerenciar convites.</Alert>
      )}
    </PaginaAutenticada>
  )
}
