import { cn } from '../../lib/cn'
import { useFormatarMoeda } from './usePrivacidade'
import styles from './MascaraValores.module.css'

interface MascaraValoresProps {
  /** Centavos inteiros como string (a API nunca devolve valor monetario em ponto flutuante). */
  centavos: string | null | undefined
  className?: string
}

/** Valor monetario com numerais tabulares; mascarado no modo privacidade. Ausente (`null`) nunca vira zero. */
export function MascaraValores({ centavos, className }: MascaraValoresProps) {
  const formatar = useFormatarMoeda()
  return <span className={cn(styles.valor, className)}>{formatar(centavos)}</span>
}
