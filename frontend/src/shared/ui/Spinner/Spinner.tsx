import styles from './Spinner.module.css'

/** Indicador visual decorativo; quem o usa deve prover o texto acessivel. */
export function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />
}

interface LoadingIndicatorProps {
  label?: string
}

/** Carregamento de pagina/secao anunciado por leitores de tela. */
export function LoadingIndicator({ label = 'Carregando' }: LoadingIndicatorProps) {
  return (
    <div className={styles.indicator} role="status">
      <Spinner />
      <span>{label}</span>
    </div>
  )
}
