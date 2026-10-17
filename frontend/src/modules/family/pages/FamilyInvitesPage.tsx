import { LogoutButton, useSession } from '../../auth'
import { BrandLayout } from '../../../shared/layouts/BrandLayout/BrandLayout'

/**
 * Destino da transicao AUTH-005 para quem tem convite pendente e nenhuma familia.
 * O aceite de convites pertence ao modulo Gestao Familiar (RF-001), ainda nao implementado.
 */
export function FamilyInvitesPage() {
  const { data: session } = useSession()
  const invites = session?.status === 'authenticated' ? session.contexto.convitesPendentes : []

  return (
    <BrandLayout title="Você tem convites" subtitle="Alguém convidou você para uma família.">
      <ul>
        {invites.map((invite) => (
          <li key={invite.uid}>{invite.familiaNome}</li>
        ))}
      </ul>
      <p>O aceite de convites será liberado no módulo de Gestão Familiar.</p>
      <LogoutButton />
    </BrandLayout>
  )
}
