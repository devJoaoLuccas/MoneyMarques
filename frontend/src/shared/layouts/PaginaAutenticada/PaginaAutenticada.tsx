import { useId, type ReactNode } from 'react'
import styles from './PaginaAutenticada.module.css'

interface PaginaAutenticadaProps {
  title: string
  subtitle?: string
  children: ReactNode
}

/** Titulo + conteudo de uma tela dentro do LayoutAutenticado (que ja provê menu e cabecalho). */
export function PaginaAutenticada({ title, subtitle, children }: PaginaAutenticadaProps) {
  const titleId = useId()
  return (
    <section className={styles.pagina} aria-labelledby={titleId}>
      <header className={styles.titulo}>
        <h1 id={titleId} className={styles.h1}>
          {title}
        </h1>
        {subtitle && <p className={styles.subtitulo}>{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}
