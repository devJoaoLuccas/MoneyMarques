import { z } from 'zod'

/**
 * Validacao de formulario: conveniencia de UX. A validacao que vale e a do
 * servidor; estes limites espelham a politica do backend (CA-008).
 */
export const EMAIL_MAX_LENGTH = 254
export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128
const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 120

const email = z
  .string()
  .trim()
  .min(1, 'Informe seu e-mail.')
  .max(EMAIL_MAX_LENGTH, `O e-mail deve ter até ${EMAIL_MAX_LENGTH} caracteres.`)
  .pipe(z.email('Informe um e-mail válido.'))

/** Nova senha (cadastro/redefinicao): sem regras arbitrarias de composicao. */
const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(PASSWORD_MAX_LENGTH, `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`)

const fullName = z
  .string()
  .transform((value) => value.trim().replace(/\s+/g, ' '))
  .pipe(
    z
      .string()
      .min(NAME_MIN_LENGTH, `Informe seu nome completo (mínimo ${NAME_MIN_LENGTH} caracteres).`)
      .max(NAME_MAX_LENGTH, `O nome deve ter até ${NAME_MAX_LENGTH} caracteres.`),
  )

const passwordsMatch = {
  check: (value: { senha: string; confirmarSenha: string }) => value.senha === value.confirmarSenha,
  issue: { path: ['confirmarSenha'], message: 'As senhas não conferem.' },
}

/** No login a senha nao sofre trim nem regra de composicao (apenas obrigatoria). */
export const loginSchema = z.object({
  email,
  senha: z.string().min(1, 'Informe sua senha.'),
  manterSessao: z.boolean(),
})

export const registerSchema = z
  .object({
    nomeCompleto: fullName,
    email,
    senha: newPassword,
    confirmarSenha: z.string(),
    aceiteTermos: z.boolean().refine((value) => value, {
      message: 'É necessário aceitar os Termos de Uso e a Política de Privacidade.',
    }),
  })
  .refine(passwordsMatch.check, passwordsMatch.issue)

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z
  .object({ senha: newPassword, confirmarSenha: z.string() })
  .refine(passwordsMatch.check, passwordsMatch.issue)

const RECOVERY_CODE_LENGTH = 10

export const mfaSchema = z
  .object({
    modo: z.enum(['totp', 'recuperacao']),
    codigo: z.string().trim(),
  })
  .superRefine((value, context) => {
    if (value.modo === 'totp') {
      if (!/^\d{6}$/.test(value.codigo)) {
        context.addIssue({ code: 'custom', path: ['codigo'], message: 'O código deve ter 6 dígitos.' })
      }
      return
    }
    const compact = value.codigo.replace(/[^a-zA-Z0-9]/g, '')
    if (compact.length !== RECOVERY_CODE_LENGTH) {
      context.addIssue({
        code: 'custom',
        path: ['codigo'],
        message: `Informe o código de recuperação com ${RECOVERY_CODE_LENGTH} caracteres.`,
      })
    }
  })

export type LoginFormValues = z.input<typeof loginSchema>
export type RegisterFormValues = z.input<typeof registerSchema>
export type ForgotPasswordFormValues = z.input<typeof forgotPasswordSchema>
export type ResetPasswordFormValues = z.input<typeof resetPasswordSchema>
export type MfaFormValues = z.input<typeof mfaSchema>
