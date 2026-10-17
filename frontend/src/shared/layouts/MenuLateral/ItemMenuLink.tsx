import { useState } from 'react'
import { FiChevronDown } from 'react-icons/fi'
import { NavLink, matchPath, useLocation } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { paths } from '../../routes/paths'
import type { ItemMenu } from './menuConfig'
import styles from './MenuLateral.module.css'

interface ItemMenuLinkProps {
  item: ItemMenu
  compacto: boolean
  /** Pede para sair do modo compacto (itens com submenu precisam do rotulo). */
  aoExpandir: () => void
}

const classeLink = ({ isActive }: { isActive: boolean }) => cn(styles.item, isActive && styles.itemAtivo)

/** Item do menu: link, item "em breve" (desabilitado) ou grupo com submenu. */
export function ItemMenuLink({ item, compacto, aoExpandir }: ItemMenuLinkProps) {
  const { pathname } = useLocation()
  const Icone = item.icone
  const filhoAtivo = item.filhos?.some((filho) => filho.rota && matchPath({ path: filho.rota }, pathname)) ?? false
  const [aberto, setAberto] = useState(filhoAtivo)
  const icone = Icone ? <Icone aria-hidden="true" className={styles.icone} /> : null

  if (item.filhos) {
    const expandido = aberto && !compacto
    const idSubmenu = `submenu-${item.id}`
    return (
      <li className={styles.li}>
        <button
          type="button"
          className={cn(styles.item, styles.itemGrupo, filhoAtivo && styles.itemPai)}
          aria-expanded={expandido}
          aria-controls={idSubmenu}
          aria-label={compacto ? item.rotulo : undefined}
          data-tooltip={compacto ? item.rotulo : undefined}
          onClick={() => {
            if (compacto) {
              aoExpandir()
              setAberto(true)
            } else {
              setAberto((atual) => !atual)
            }
          }}
        >
          {icone}
          <span className={styles.rotulo}>{item.rotulo}</span>
          <FiChevronDown aria-hidden="true" className={cn(styles.seta, expandido && styles.setaAberta)} />
        </button>
        <ul id={idSubmenu} className={styles.submenu} hidden={!expandido}>
          {item.filhos.map((filho) => (
            <li key={filho.id} className={styles.li}>
              {filho.rota ? (
                <NavLink to={filho.rota} end className={classeLink}>
                  <span className={styles.marcador} aria-hidden="true" />
                  <span className={styles.rotulo}>{filho.rotulo}</span>
                </NavLink>
              ) : (
                <button type="button" className={cn(styles.item, styles.itemEmBreve)} disabled>
                  <span className={styles.marcador} aria-hidden="true" />
                  <span className={styles.rotulo}>{filho.rotulo}</span>
                  <span className={styles.selo}>Em breve</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </li>
    )
  }

  if (!item.rota) {
    return (
      <li className={styles.li}>
        <button
          type="button"
          className={cn(styles.item, styles.itemEmBreve)}
          disabled
          aria-label={compacto ? `${item.rotulo} (em breve)` : undefined}
          data-tooltip={compacto ? `${item.rotulo} (em breve)` : undefined}
        >
          {icone}
          <span className={styles.rotulo}>{item.rotulo}</span>
          <span className={styles.selo}>Em breve</span>
        </button>
      </li>
    )
  }

  return (
    <li className={styles.li}>
      <NavLink
        to={item.rota}
        end={item.rota === paths.app}
        className={classeLink}
        aria-label={compacto ? item.rotulo : undefined}
        data-tooltip={compacto ? item.rotulo : undefined}
      >
        {icone}
        <span className={styles.rotulo}>{item.rotulo}</span>
      </NavLink>
    </li>
  )
}
