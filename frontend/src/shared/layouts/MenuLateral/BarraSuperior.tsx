import { FiBell, FiMenu } from 'react-icons/fi'
import logoHorizontal from '../../../assets/brand/logo-horizontal.webp'
import { iniciais } from './iniciais'
import styles from './MenuLateral.module.css'

interface BarraSuperiorProps {
  nome: string
  menuAberto: boolean
  onAbrirMenu: () => void
}

/** Barra superior abaixo de 1024 px: hamburguer, logo central, notificacoes e avatar. */
export function BarraSuperior({ nome, menuAberto, onAbrirMenu }: BarraSuperiorProps) {
  return (
    <header className={styles.barra}>
      <button
        type="button"
        className={styles.botaoBarra}
        aria-label="Abrir menu"
        aria-haspopup="dialog"
        aria-expanded={menuAberto}
        onClick={onAbrirMenu}
      >
        <FiMenu aria-hidden="true" />
      </button>
      <img className={styles.logoBarra} src={logoHorizontal} alt="Money Marques" width={900} height={507} />
      <div className={styles.acoesBarra}>
        {/* Notificacoes (RF-015) ainda nao existem: sem acao inventada. */}
        <button type="button" className={styles.botaoBarra} aria-label="Notificações (em breve)" disabled>
          <FiBell aria-hidden="true" />
        </button>
        <span className={styles.avatar} role="img" aria-label={`Usuário ${nome}`}>
          {iniciais(nome)}
        </span>
      </div>
    </header>
  )
}
