import { PaginaAutenticada } from '../../../shared/layouts/PaginaAutenticada/PaginaAutenticada'
import { MembersPanel } from '../components/MembersPanel'
import { useActiveFamily } from '../hooks/useFamily'

/** FAM-003: integrantes da familia ativa. */
export function FamilyMembersPage() {
  const family = useActiveFamily()
  if (!family) return null

  return (
    <PaginaAutenticada title="Integrantes" subtitle={`Pessoas da família ${family.nome}.`}>
      <MembersPanel family={family} />
    </PaginaAutenticada>
  )
}
