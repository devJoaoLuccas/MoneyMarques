import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '../../lib/cn'
import type { ButtonVariant } from './Button'
import styles from './Button.module.css'

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
  fullWidth?: boolean
}

/** Navegacao com a aparencia de Button (semantica de link, area de toque de 44 px). */
export function ButtonLink({ variant = 'secondary', fullWidth = false, className, ...rest }: ButtonLinkProps) {
  return <Link {...rest} className={cn(styles.button, styles[variant], fullWidth && styles.fullWidth, className)} />
}
