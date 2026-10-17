import { BrandLayout } from '../../../shared/layouts/BrandLayout/BrandLayout'
import { ContextSelector } from '../components/ContextSelector'

export function ContextPage() {
  return (
    <BrandLayout title="Escolha a família" subtitle="Você participa de mais de uma família. Qual deseja acessar?">
      <ContextSelector />
    </BrandLayout>
  )
}
