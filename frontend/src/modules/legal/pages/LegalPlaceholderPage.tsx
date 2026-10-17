import { Link } from 'react-router-dom'
import { BrandLayout } from '../../../shared/layouts/BrandLayout/BrandLayout'
import { paths } from '../../../shared/routes/paths'

interface LegalPlaceholderPageProps {
  title: string
}

/**
 * Os textos de Termos de Uso e Politica de Privacidade dependem de validacao
 * juridica (autenticacao.md 4.2). Nao inventamos conteudo juridico: pagina provisoria.
 */
export function LegalPlaceholderPage({ title }: LegalPlaceholderPageProps) {
  return (
    <BrandLayout title={title}>
      <p>Este documento está em elaboração e aguarda validação jurídica antes do lançamento.</p>
      <Link to={paths.login}>Voltar</Link>
    </BrandLayout>
  )
}
