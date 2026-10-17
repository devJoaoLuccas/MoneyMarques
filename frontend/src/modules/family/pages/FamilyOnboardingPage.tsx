import { LogoutButton } from '../../auth'
import { BrandLayout } from '../../../shared/layouts/BrandLayout/BrandLayout'

/**
 * Destino da transicao AUTH-005 para quem ainda nao tem familia.
 * A criacao de familias pertence ao modulo Gestao Familiar (RF-001), ainda nao implementado.
 */
export function FamilyOnboardingPage() {
  return (
    <BrandLayout title="Crie sua família" subtitle="Falta pouco para começar.">
      <p>A criação do grupo familiar será liberada no módulo de Gestão Familiar.</p>
      <LogoutButton />
    </BrandLayout>
  )
}
