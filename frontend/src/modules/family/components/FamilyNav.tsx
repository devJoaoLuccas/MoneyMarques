import { NavLink } from 'react-router-dom'
import { paths } from '../../../shared/routes/paths'
import { cn } from '../../../shared/lib/cn'
import type { FamilyRole } from '../types'
import styles from './FamilyPanels.module.css'

interface FamilyNavProps {
  papel: FamilyRole
}

/** Navegacao da gestao familiar. Ocultar itens de admin e conveniencia: o servidor autoriza. */
export function FamilyNav({ papel }: FamilyNavProps) {
  const link = ({ isActive }: { isActive: boolean }) => cn(styles.navLink, isActive && styles.navLinkActive)
  return (
    <nav aria-label="Gestão da família" className={styles.nav}>
      <NavLink to={paths.app} end className={link}>
        Painel
      </NavLink>
      <NavLink to={paths.familyMembers} className={link}>
        Integrantes
      </NavLink>
      {papel === 'ADMINISTRADOR' && (
        <NavLink to={paths.familySentInvites} className={link}>
          Convites enviados
        </NavLink>
      )}
    </nav>
  )
}
