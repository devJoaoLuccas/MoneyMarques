import { FiAlertCircle } from 'react-icons/fi'
import styles from './FieldMessage.module.css'

interface FieldMessageProps {
  hintId: string
  errorId: string
  hint?: string
  error?: string
}

/** Ajuda e erro de campo, ligados ao controle por aria-describedby (WCAG). */
export function FieldMessage({ hintId, errorId, hint, error }: FieldMessageProps) {
  return (
    <>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className={styles.error}>
          <FiAlertCircle aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </>
  )
}
