import { BrandLayout } from '../../../shared/layouts/BrandLayout/BrandLayout'
import { CreateFamilyForm } from '../components/CreateFamilyForm'

/** Destino da transicao AUTH-005 para quem ainda nao tem familia (FAM-001). */
export function FamilyOnboardingPage() {
  return (
    <BrandLayout
      eyebrow="Primeiro passo"
      title="Crie sua família"
      subtitle="Reúna as finanças de quem divide a vida com você. Você será o administrador."
    >
      <CreateFamilyForm />
    </BrandLayout>
  )
}
