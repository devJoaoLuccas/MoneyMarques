import type { ReactNode } from 'react'
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiInfo } from 'react-icons/fi'
import { cn } from '../../lib/cn'
import styles from './Alert.module.css'

export type AlertVariant = 'error' | 'success' | 'info' | 'warning'

interface AlertProps {
  variant: AlertVariant
  title?: string
  children: ReactNode
}

const config = {
  error: { Icon: FiAlertCircle, label: 'Erro', role: 'alert' },
  success: { Icon: FiCheckCircle, label: 'Sucesso', role: 'status' },
  info: { Icon: FiInfo, label: 'Informação', role: 'status' },
  warning: { Icon: FiAlertTriangle, label: 'Atenção', role: 'status' },
} as const

/**
 * Mensagem de feedback. Nao depende so de cor: combina icone e rotulo textual
 * (lido por leitores de tela). Erros usam role=alert; demais, role=status.
 */
export function Alert({ variant, title, children }: AlertProps) {
  const { Icon, label, role } = config[variant]

  return (
    <div role={role} className={cn(styles.alert, styles[variant])}>
      <Icon aria-hidden="true" className={styles.icon} />
      <div className={styles.content}>
        {title && <p className={styles.title}>{title}</p>}
        <p>
          <span className="visually-hidden">{label}: </span>
          {children}
        </p>
      </div>
    </div>
  )
}
