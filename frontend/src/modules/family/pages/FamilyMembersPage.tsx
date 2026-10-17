import { BrandLayout } from '../../../shared/layouts/BrandLayout/BrandLayout'
import { FamilyNav } from '../components/FamilyNav'
import { MembersPanel } from '../components/MembersPanel'
import { useActiveFamily } from '../hooks/useFamily'

/** FAM-003: integrantes da familia ativa. */
export function FamilyMembersPage() {
  const family = useActiveFamily()
  if (!family) return null

  return (
    <BrandLayout wide title="Integrantes" subtitle={`Pessoas da família ${family.nome}.`}>
      <FamilyNav papel={family.papel} />
      <MembersPanel family={family} />
    </BrandLayout>
  )
}
