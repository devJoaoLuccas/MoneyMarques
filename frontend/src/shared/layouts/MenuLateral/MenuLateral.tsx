import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { FiChevronsLeft, FiChevronsRight, FiX } from 'react-icons/fi'
import { useLocation } from 'react-router-dom'
import logoHorizontal from '../../../assets/brand/logo-horizontal.webp'
import simbolo from '../../../assets/brand/simbolo.webp'
import { cn } from '../../lib/cn'
import { ItemMenuLink } from './ItemMenuLink'
import { filtrarItensMenu, itensMenu, rotuloPapel, type PapelMenu } from './menuConfig'
import { PerfilMenu } from './PerfilMenu'
import styles from './MenuLateral.module.css'

interface MenuLateralProps {
  papel: PapelMenu
  nome: string
  recolhido: boolean
  onAlternarRecolhido: () => void
  drawerAberto: boolean
  onFecharDrawer: () => void
  acaoSair?: ReactNode
}

interface ConteudoMenuProps {
  papel: PapelMenu
  nome: string
  compacto: boolean
  acaoSair?: ReactNode
  aoExpandir: () => void
}

function ConteudoMenu({ papel, nome, compacto, acaoSair, aoExpandir }: ConteudoMenuProps) {
  const itens = filtrarItensMenu(itensMenu, papel)
  return (
    <>
      <div className={styles.marca}>
        {compacto ? (
          <img className={styles.simbolo} src={simbolo} alt="Money Marques" width={512} height={512} />
        ) : (
          <img className={styles.logo} src={logoHorizontal} alt="Money Marques" width={900} height={507} />
        )}
      </div>
      <nav aria-label="Principal" className={styles.nav}>
        <ul className={styles.lista}>
          {itens.map((item) => (
            <ItemMenuLink key={item.id} item={item} compacto={compacto} aoExpandir={aoExpandir} />
          ))}
        </ul>
      </nav>
      <PerfilMenu nome={nome} papel={rotuloPapel[papel]} acaoSair={acaoSair} compacto={compacto} />
    </>
  )
}

const FOCAVEIS = 'a[href], button:not(:disabled)'

type DrawerMenuProps = Omit<ConteudoMenuProps, 'compacto' | 'aoExpandir'> & {
  onFechar: () => void
}

/** Drawer mobile: foco preso, Esc fecha, fecha ao navegar e devolve o foco a quem o abriu. */
function DrawerMenu({ onFechar, ...conteudo }: DrawerMenuProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const fecharRef = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()
  const caminhoInicial = useRef(pathname)

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    fecharRef.current?.focus()
    return () => anterior?.focus?.()
  }, [])

  useEffect(() => {
    if (pathname !== caminhoInicial.current) onFechar()
  }, [pathname, onFechar])

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === 'Escape') {
      evento.stopPropagation()
      onFechar()
      return
    }
    if (evento.key !== 'Tab') return
    const focaveis = drawerRef.current?.querySelectorAll<HTMLElement>(FOCAVEIS)
    if (!focaveis || focaveis.length === 0) return
    const primeiro = focaveis[0]
    const ultimo = focaveis[focaveis.length - 1]
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault()
      ultimo.focus()
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault()
      primeiro.focus()
    }
  }

  return (
    <div className={styles.overlay} onClick={onFechar}>
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu principal"
        className={styles.drawer}
        onClick={(evento) => evento.stopPropagation()}
        onKeyDown={aoTeclar}
      >
        <button ref={fecharRef} type="button" className={styles.fechar} aria-label="Fechar menu" onClick={onFechar}>
          <FiX aria-hidden="true" />
        </button>
        <ConteudoMenu {...conteudo} compacto={false} aoExpandir={onFechar} />
      </div>
    </div>
  )
}

/**
 * Componente unico de navegacao (nao ha sidebar por tela). Desktop (>= 1024 px):
 * barra fixa, expandida ou compacta. Abaixo disso: drawer acionado pela barra superior.
 */
export function MenuLateral({
  papel,
  nome,
  recolhido,
  onAlternarRecolhido,
  drawerAberto,
  onFecharDrawer,
  acaoSair,
}: MenuLateralProps) {
  return (
    <>
      <aside className={cn(styles.aside, recolhido && styles.asideCompacto)}>
        <ConteudoMenu
          papel={papel}
          nome={nome}
          compacto={recolhido}
          acaoSair={acaoSair}
          aoExpandir={onAlternarRecolhido}
        />
        <button
          type="button"
          className={styles.recolher}
          aria-expanded={!recolhido}
          aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
          data-tooltip={recolhido ? 'Expandir menu' : undefined}
          onClick={onAlternarRecolhido}
        >
          {recolhido ? <FiChevronsRight aria-hidden="true" /> : <FiChevronsLeft aria-hidden="true" />}
          <span className={styles.rotulo}>Recolher menu</span>
        </button>
      </aside>
      {drawerAberto && <DrawerMenu papel={papel} nome={nome} acaoSair={acaoSair} onFechar={onFecharDrawer} />}
    </>
  )
}
