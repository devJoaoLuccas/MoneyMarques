import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { describedBy } from '../FieldMessage/describedBy'
import { FieldMessage } from '../FieldMessage/FieldMessage'
import styles from './Checkbox.module.css'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Aceita conteudo rico (ex.: links para os termos). */
  label: ReactNode
  error?: string
  ref?: Ref<HTMLInputElement>
}

export function Checkbox({ label, error, id, ref, ...rest }: CheckboxProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const ids = { hintId: `${inputId}-hint`, errorId: `${inputId}-error` }

  return (
    <div>
      <label className={styles.label}>
        <input
          {...rest}
          ref={ref}
          id={inputId}
          type="checkbox"
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(ids, { error })}
        />
        <span>{label}</span>
      </label>
      <FieldMessage {...ids} error={error} />
    </div>
  )
}
