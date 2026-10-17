import { Link } from 'react-router-dom'
import { BrandLayout } from '../../shared/layouts/BrandLayout/BrandLayout'

export function NotFoundPage() {
  return (
    <BrandLayout title="Página não encontrada">
      <p>O endereço acessado não existe ou foi movido.</p>
      <Link to="/">Voltar ao início</Link>
    </BrandLayout>
  )
}
