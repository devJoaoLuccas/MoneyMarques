import { LogoutButton, useSession } from '../../auth'
import { BrandLayout } from '../../../shared/layouts/BrandLayout/BrandLayout'

/**
 * Marcador da area autenticada. O dashboard real (RF-010) e o proximo modulo
 * do roadmap; esta tela so prova o fluxo de autenticacao ponta a ponta.
 */
export function DashboardPage() {
  const { data: session } = useSession()
  const firstName = session?.status === 'authenticated' ? session.usuario.nomeCompleto.split(' ')[0] : null

  return (
    <BrandLayout title={firstName ? `Olá, ${firstName}` : 'Olá'} subtitle="Você está autenticado.">
      <p>O painel financeiro será construído no próximo módulo do roadmap.</p>
      <LogoutButton />
    </BrandLayout>
  )
}
