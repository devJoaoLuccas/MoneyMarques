import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

interface EmptyStateProps {
  title: string
  children?: ReactNode
}

/** Estado vazio de listas: explica o que falta e, quando houver, qual o proximo passo. */
export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <p className={styles.title}>{title}</p>
      {children && <div className={styles.body}>{children}</div>}
    </div>
  )
}
