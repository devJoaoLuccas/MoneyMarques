import { useId, type Ref, type SelectHTMLAttributes } from 'react'
import { describedBy } from '../FieldMessage/describedBy'
import { FieldMessage } from '../FieldMessage/FieldMessage'
import textFieldStyles from '../TextField/TextField.module.css'
import { cn } from '../../lib/cn'
import styles from './SelectField.module.css'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: readonly SelectOption[]
  hint?: string
  error?: string
  ref?: Ref<HTMLSelectElement>
}

/** Lista de opcoes nativa (acessivel por teclado e leitores de tela), no visual dos campos. */
export function SelectField({ label, options, hint, error, id, className, ref, ...rest }: SelectFieldProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const ids = { hintId: `${selectId}-hint`, errorId: `${selectId}-error` }

  return (
    <div className={textFieldStyles.field}>
      <label htmlFor={selectId} className={textFieldStyles.label}>
        {label}
      </label>
      <select
        {...rest}
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, { hint, error })}
        className={cn(textFieldStyles.input, styles.select, error && textFieldStyles.invalid, className)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldMessage {...ids} hint={hint} error={error} />
    </div>
  )
}
