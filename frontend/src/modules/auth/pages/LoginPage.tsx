import { BrandLayout } from '../../../shared/layouts/BrandLayout/BrandLayout'
import { LoginForm } from '../components/LoginForm'

export function LoginPage() {
  return (
    <BrandLayout
      eyebrow="Bem-vindo de volta"
      title="Entre na sua conta"
      subtitle="Continue sua jornada rumo a uma vida financeira extraordinária."
    >
      <LoginForm />
    </BrandLayout>
  )
}
