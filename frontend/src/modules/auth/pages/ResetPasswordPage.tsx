import { BrandLayout } from '../../../shared/layouts/BrandLayout/BrandLayout'
import { ResetPasswordForm } from '../components/ResetPasswordForm'

export function ResetPasswordPage() {
  return (
    <BrandLayout title="Redefinir senha" subtitle="Escolha uma nova senha para a sua conta.">
      <ResetPasswordForm />
    </BrandLayout>
  )
}
