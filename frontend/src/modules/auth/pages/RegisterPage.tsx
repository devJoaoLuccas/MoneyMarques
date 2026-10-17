import { BrandLayout } from '../../../shared/layouts/BrandLayout/BrandLayout'
import { RegisterForm } from '../components/RegisterForm'

export function RegisterPage() {
  return (
    <BrandLayout title="Criar conta" subtitle="Comece a organizar as finanças da sua família.">
      <RegisterForm />
    </BrandLayout>
  )
}
