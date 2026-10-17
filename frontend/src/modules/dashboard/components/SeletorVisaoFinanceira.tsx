import { cn } from '../../../shared/lib/cn'
import type { VisaoFinanceira } from '../types'
import styles from './CabecalhoFinanceiro.module.css'

interface SeletorVisaoFinanceiraProps {
  visao: VisaoFinanceira
  onChange: (visao: VisaoFinanceira) => void
}

const opcoes: { valor: VisaoFinanceira; rotulo: string }[] = [
  { valor: 'pessoal', rotulo: 'Pessoal' },
  { valor: 'familiar', rotulo: 'Familiar' },
]

/** Visao PESSOAL | FAMILIAR sempre visivel: o estado ativo vai por texto e `aria-pressed`, nao so por cor. */
export function SeletorVisaoFinanceira({ visao, onChange }: SeletorVisaoFinanceiraProps) {
  return (
    <div role="group" aria-label="Visão financeira" className={styles.segmentos}>
      {opcoes.map(({ valor, rotulo }) => (
        <button
          key={valor}
          type="button"
          aria-pressed={visao === valor}
          className={cn(styles.segmento, visao === valor && styles.segmentoAtivo)}
          onClick={() => onChange(valor)}
        >
          {rotulo}
        </button>
      ))}
    </div>
  )
}
