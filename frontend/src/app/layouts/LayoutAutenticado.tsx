import { Outlet, useLocation } from 'react-router-dom'
import { BarraSuperior } from '../../shared/layouts/MenuLateral/BarraSuperior'
import { MenuLateral } from '../../shared/layouts/MenuLateral/MenuLateral'
import { useMenuLateral } from '../../shared/layouts/MenuLateral/useMenuLateral'
import { paths } from '../../shared/routes/paths'
import { PrivacidadeProvider } from '../../shared/ui'
import { LogoutButton, useSession } from '../../modules/auth'
import { CabecalhoFinanceiro, useFiltrosFinanceiros, useIsolamentoCachePainel } from '../../modules/dashboard'
import { useActiveFamily } from '../../modules/family'
import styles from './LayoutAutenticado.module.css'

interface ShellProps {
  usuarioUid: string
  nome: string
  familiaUid: string
  papel: 'ADMINISTRADOR' | 'INTEGRANTE' | 'VISUALIZADOR'
}

function Shell({ usuarioUid, nome, familiaUid, papel }: ShellProps) {
  const { pathname } = useLocation()
  const { visao } = useFiltrosFinanceiros()
  const menu = useMenuLateral(usuarioUid)
  useIsolamentoCachePainel({ familiaUid, usuarioUid, visao })

  return (
    <div className={styles.shell}>
      <a href="#conteudo" className={styles.pularParaConteudo}>
        Pular para o conteúdo
      </a>
      <MenuLateral
        papel={papel}
        nome={nome}
        recolhido={menu.recolhido}
        onAlternarRecolhido={menu.alternarRecolhido}
        drawerAberto={menu.drawerAberto}
        onFecharDrawer={menu.fecharDrawer}
        acaoSair={<LogoutButton variant="ghost" label="Sair" />}
      />
      <div className={styles.coluna}>
        <BarraSuperior nome={nome} menuAberto={menu.drawerAberto} onAbrirMenu={menu.abrirDrawer} />
        <main id="conteudo" className={styles.conteudo} tabIndex={-1}>
          <CabecalhoFinanceiro comFiltros={pathname.startsWith(paths.dashboard)} />
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/**
 * Layout de todas as rotas privadas com familia ativa: MenuLateral (unico),
 * barra superior no mobile, CabecalhoFinanceiro e o conteudo da rota.
 */
export function LayoutAutenticado() {
  const { data: sessao } = useSession()
  const familia = useActiveFamily()
  if (sessao?.status !== 'authenticated' || !familia) return null

  return (
    <PrivacidadeProvider>
      <Shell
        usuarioUid={sessao.usuario.uid}
        nome={sessao.usuario.nomeCompleto}
        familiaUid={familia.uid}
        papel={familia.papel}
      />
    </PrivacidadeProvider>
  )
}
