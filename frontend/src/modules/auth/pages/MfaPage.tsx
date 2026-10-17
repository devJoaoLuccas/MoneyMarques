import { BrandLayout } from '../../../shared/layouts/BrandLayout/BrandLayout'
import { MfaForm } from '../components/MfaForm'

export function MfaPage() {
  return (
    <BrandLayout title="Verificação em duas etapas" subtitle="Confirme que é você para acessar suas finanças.">
      <MfaForm />
    </BrandLayout>
  )
}
