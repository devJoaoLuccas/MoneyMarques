import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { cn } from '../../lib/cn'
import { describedBy } from '../FieldMessage/describedBy'
import { FieldMessage } from '../FieldMessage/FieldMessage'
import styles from './TextField.module.css'

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
  /** Controle dentro do campo, a direita (ex.: mostrar/ocultar senha). */
  endAdornment?: ReactNode
  /** Icone decorativo dentro do campo, a esquerda (ex.: envelope, cadeado). */
  startIcon?: ReactNode
  ref?: Ref<HTMLInputElement>
}

export function TextField({ label, hint, error, endAdornment, startIcon, id, className, ref, ...rest }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const ids = { hintId: `${inputId}-hint`, errorId: `${inputId}-error` }

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={styles.control}>
        {startIcon && (
          <span className={styles.startIcon} aria-hidden="true">
            {startIcon}
          </span>
        )}
        <input
          {...rest}
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(ids, { hint, error })}
          className={cn(styles.input, error && styles.invalid, Boolean(endAdornment) && styles.withAdornment, Boolean(startIcon) && styles.withStartIcon, className)}
        />
        {endAdornment && <div className={styles.adornment}>{endAdornment}</div>}
      </div>
      <FieldMessage {...ids} hint={hint} error={error} />
    </div>
  )
}
