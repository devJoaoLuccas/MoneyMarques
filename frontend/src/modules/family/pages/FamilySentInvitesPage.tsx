import { Alert } from '../../../shared/ui'
import { BrandLayout } from '../../../shared/layouts/BrandLayout/BrandLayout'
import { FamilyNav } from '../components/FamilyNav'
import { SentInvitesPanel } from '../components/SentInvitesPanel'
import { useActiveFamily } from '../hooks/useFamily'

/** FAM-005: convites da familia ativa. Somente administradores (o servidor tambem exige). */
export function FamilySentInvitesPage() {
  const family = useActiveFamily()
  if (!family) return null

  return (
    <BrandLayout wide title="Convites enviados" subtitle="Convide pessoas e acompanhe as respostas.">
      <FamilyNav papel={family.papel} />
      {family.papel === 'ADMINISTRADOR' ? (
        <SentInvitesPanel family={family} />
      ) : (
        <Alert variant="warning">Apenas administradores podem gerenciar convites.</Alert>
      )}
    </BrandLayout>
  )
}
