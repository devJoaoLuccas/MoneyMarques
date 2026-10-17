import { z } from 'zod'
import type { FamilyRole } from '../types'

/**
 * Validacao de formulario: conveniencia de UX. A validacao que vale e a do
 * servidor; estes limites espelham o backend (FAM-001, FAM-005).
 */
export const FAMILY_NAME_MIN = 3
export const FAMILY_NAME_MAX = 40
export const FAMILY_DESCRIPTION_MAX = 240
export const EMAIL_MAX_LENGTH = 254

/** Avatares predefinidos (D-FAM-008): mesmos identificadores do backend. */
export const FAMILY_AVATARS = ['casa', 'casal', 'familia'] as const
export type FamilyAvatar = (typeof FAMILY_AVATARS)[number]

export const ROLE_LABELS: Record<FamilyRole, string> = {
  ADMINISTRADOR: 'Administrador',
  INTEGRANTE: 'Integrante',
  VISUALIZADOR: 'Visualizador',
}

export const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as FamilyRole[]).map((value) => ({
  value,
  label: ROLE_LABELS[value],
}))

const roleEnum = z.enum(['ADMINISTRADOR', 'INTEGRANTE', 'VISUALIZADOR'])

export const createFamilySchema = z.object({
  nome: z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, ' '))
    .pipe(
      z
        .string()
        .min(FAMILY_NAME_MIN, `O nome deve ter entre ${FAMILY_NAME_MIN} e ${FAMILY_NAME_MAX} caracteres.`)
        .max(FAMILY_NAME_MAX, `O nome deve ter entre ${FAMILY_NAME_MIN} e ${FAMILY_NAME_MAX} caracteres.`),
    ),
  descricao: z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, ' '))
    .pipe(z.string().max(FAMILY_DESCRIPTION_MAX, `A descrição deve ter até ${FAMILY_DESCRIPTION_MAX} caracteres.`)),
  avatar: z.enum(FAMILY_AVATARS, {
    error: 'Escolha um dos ícones disponíveis.',
  }),
})

export const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail da pessoa.')
    .max(EMAIL_MAX_LENGTH, `O e-mail deve ter até ${EMAIL_MAX_LENGTH} caracteres.`)
    .pipe(z.email('Informe um e-mail válido.')),
  papel: roleEnum,
})

export type CreateFamilyFormValues = z.input<typeof createFamilySchema>
export type CreateFamilyPayload = z.output<typeof createFamilySchema>
export type InviteFormValues = z.input<typeof inviteSchema>
export type InvitePayload = z.output<typeof inviteSchema>
