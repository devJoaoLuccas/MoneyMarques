import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { rotuloPeriodo } from '../filtros/periodo'
import styles from './CabecalhoFinanceiro.module.css'

interface SeletorPeriodoProps {
  periodo: string
  onAnterior: () => void
  onProximo: () => void
}

/** Mes civil de referencia (D-DASH-005: periodos personalizados ficam para depois). */
export function SeletorPeriodo({ periodo, onAnterior, onProximo }: SeletorPeriodoProps) {
  return (
    <div role="group" aria-label="Período" className={styles.periodo}>
      <button type="button" className={styles.botaoIcone} aria-label="Mês anterior" onClick={onAnterior}>
        <FiChevronLeft aria-hidden="true" />
      </button>
      <span className={styles.periodoRotulo} aria-live="polite">
        {rotuloPeriodo(periodo)}
      </span>
      <button type="button" className={styles.botaoIcone} aria-label="Próximo mês" onClick={onProximo}>
        <FiChevronRight aria-hidden="true" />
      </button>
    </div>
  )
}
