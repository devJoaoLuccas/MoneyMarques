import { FiAlertCircle, FiCheckCircle, FiClock, FiMinusCircle } from 'react-icons/fi'
import { cn } from '../../../shared/lib/cn'
import type { StatusCompromisso } from '../types'
import styles from '../pages/Telas.module.css'

const STATUS = {
  vencido: { rotulo: 'Vencido', Icone: FiAlertCircle, classe: styles.vencido },
  pendente: { rotulo: 'Pendente', Icone: FiClock, classe: styles.pendente },
  previsto: { rotulo: 'Previsto', Icone: FiMinusCircle, classe: styles.previsto },
  pago: { rotulo: 'Pago', Icone: FiCheckCircle, classe: styles.pago },
} as const

/** Status do compromisso: cor semantica SEMPRE acompanhada de icone e rotulo. */
export function SeloStatus({ status }: { status: StatusCompromisso }) {
  const { rotulo, Icone, classe } = STATUS[status]
  return (
    <span className={cn(styles.selo, classe)}>
      <Icone aria-hidden="true" />
      {rotulo}
    </span>
  )
}
