import { useState } from 'react'
import { FiEye, FiEyeOff, FiLock } from 'react-icons/fi'
import { TextField, type TextFieldProps } from '../TextField/TextField'
import styles from './PasswordField.module.css'

type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'endAdornment'>

/**
 * Campo de senha com mostrar/ocultar (CA-003). Nao bloqueia colar nem o
 * preenchimento automatico: o chamador define o autoComplete correto.
 */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <TextField
      startIcon={<FiLock />}
      {...props}
      type={visible ? 'text' : 'password'}
      endAdornment={
        <button
          type="button"
          className={styles.toggle}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
        </button>
      }
    />
  )
}
