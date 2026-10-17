import { BrandLayout } from '../../../shared/layouts/BrandLayout/BrandLayout'
import { RegisterForm } from '../components/RegisterForm'

const slogan = ['Crie sua conta.', 'Assuma o controle.']

export function RegisterPage() {
  return (
    <BrandLayout
      title="Criar conta"
      subtitle="Comece a organizar as finanças da sua família."
      slogan={slogan}
      lead="Dê o primeiro passo para uma vida financeira extraordinária. Crie sua conta e tenha todas as ferramentas para organizar, planejar e evoluir."
    >
      <RegisterForm />
    </BrandLayout>
  )
}
