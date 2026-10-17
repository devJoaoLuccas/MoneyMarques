import { BrandLayout } from '../../../shared/layouts/BrandLayout/BrandLayout'
import { InviteLinkPanel } from '../components/InviteLinkPanel'

/** Rota publica do link do e-mail (/convite#token=...): decide o que mostrar conforme a sessao. */
export function InviteLinkPage() {
  return (
    <BrandLayout
      eyebrow="Convite"
      title="Convite para uma família"
      subtitle="Confira os detalhes e responda ao convite."
    >
      <InviteLinkPanel />
    </BrandLayout>
  )
}
