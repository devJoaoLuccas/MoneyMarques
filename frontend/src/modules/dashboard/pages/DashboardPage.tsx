import { PaginaAutenticada } from '../../../shared/layouts/PaginaAutenticada/PaginaAutenticada'
import { useSession } from '../../auth'
import { useActiveFamily } from '../../family'

/** Inicio: saudacao da area autenticada. Os numeros ficam em "Minha Vida Financeira". */
export function DashboardPage() {
  const { data: session } = useSession()
  const family = useActiveFamily()
  const firstName = session?.status === 'authenticated' ? session.usuario.nomeCompleto.split(' ')[0] : null

  return (
    <PaginaAutenticada
      title={firstName ? `Olá, ${firstName}` : 'Olá'}
      subtitle={family ? `Família ${family.nome}` : 'Você está autenticado.'}
    >
      <p>Acompanhe seus números em Minha Vida Financeira, no menu.</p>
    </PaginaAutenticada>
  )
}
