import { BrandLayout } from '../../../shared/layouts/BrandLayout/BrandLayout'
import { PendingInvitesList } from '../components/PendingInvitesList'

/** Destino da transicao AUTH-005 para quem tem convite pendente e nenhuma familia (FAM-005). */
export function FamilyInvitesPage() {
  return (
    <BrandLayout title="Você tem convites" subtitle="Alguém convidou você para uma família. Aceite para entrar.">
      <PendingInvitesList />
    </BrandLayout>
  )
}
