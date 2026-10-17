import { FiCheck } from 'react-icons/fi'
import { cn } from '../../lib/cn'
import styles from './PasswordStrength.module.css'

export interface PasswordRequirement {
  id: string
  label: string
  met: boolean
}

interface PasswordStrengthProps {
  requirements: readonly PasswordRequirement[]
  /** Sem texto digitado, o componente inteiro (barra, nivel e checklist) fica oculto. */
  empty?: boolean
}

type Level = 'weak' | 'medium' | 'strong'

const LEVEL_LABEL: Record<Level, string> = {
  weak: 'Senha fraca',
  medium: 'Senha média',
  strong: 'Senha forte',
}

function levelOf(ratio: number): Level {
  if (ratio >= 1) return 'strong'
  if (ratio >= 0.6) return 'medium'
  return 'weak'
}

/**
 * Medidor de forca e checklist de requisitos da senha. Estado nunca so por cor:
 * cada requisito combina icone, texto e rotulo para leitores de tela.
 */
export function PasswordStrength({ requirements, empty = false }: PasswordStrengthProps) {
  const metCount = requirements.filter((requirement) => requirement.met).length
  const ratio = requirements.length === 0 ? 0 : metCount / requirements.length
  const level = levelOf(ratio)

  if (empty) return null

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.track} aria-hidden="true">
          <div className={cn(styles.fill, styles[level])} style={{ width: `${Math.max(ratio, 0.08) * 100}%` }} />
        </div>
        <p className={cn(styles.level, styles[`${level}Text`])} aria-live="polite">
          {LEVEL_LABEL[level]}
        </p>
      </div>

      <ul className={styles.list}>
        {requirements.map((requirement) => (
          <li key={requirement.id} className={cn(styles.item, requirement.met && styles.met)}>
            <span className={styles.icon} aria-hidden="true">
              {requirement.met && <FiCheck />}
            </span>
            {requirement.label}
            <span className="visually-hidden">{requirement.met ? ' (atendido)' : ' (pendente)'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
