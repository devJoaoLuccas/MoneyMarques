import { BrandLayout } from '../../../shared/layouts/BrandLayout/BrandLayout'
import { ForgotPasswordForm } from '../components/ForgotPasswordForm'

export function ForgotPasswordPage() {
  return (
    <BrandLayout title="Recuperar senha" subtitle="Informe seu e-mail para receber as instruções.">
      <ForgotPasswordForm />
    </BrandLayout>
  )
}
