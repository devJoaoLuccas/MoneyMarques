import { PasswordStrength } from '../../../shared/ui'
import { PASSWORD_MIN_LENGTH, PASSWORD_RULES } from '../schemas/auth.schemas'

interface PasswordRequirementsProps {
  value: string
}

/** Checklist ao vivo da politica de senha (CA-008): espelha as regras do schema. */
export function PasswordRequirements({ value }: PasswordRequirementsProps) {
  const requirements = [
    { id: 'tamanho', label: `Mínimo de ${PASSWORD_MIN_LENGTH} caracteres`, met: value.length >= PASSWORD_MIN_LENGTH },
    ...PASSWORD_RULES.map(({ id, label, pattern }) => ({ id, label, met: pattern.test(value) })),
  ]

  return <PasswordStrength requirements={requirements} empty={value.length === 0} />
}
