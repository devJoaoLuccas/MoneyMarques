import { describe, expect, it } from 'vitest'
import {
  forgotPasswordSchema,
  loginSchema,
  mfaSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.schemas'

const issuePaths = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.error?.issues.map((issue) => issue.path.join('.')) ?? []

const validRegister = {
  nomeCompleto: 'Ana Maria',
  email: 'ana@exemplo.com',
  senha: 'Frase-Longa-Segura-2026',
  confirmarSenha: 'Frase-Longa-Segura-2026',
  aceiteTermos: true,
}

describe('loginSchema (AUTH-001, CA-002)', () => {
  it('aceita credenciais validas e remove espacos do e-mail', () => {
    const result = loginSchema.safeParse({ email: '  ana@exemplo.com ', senha: 'x', manterSessao: false })
    expect(result.success).toBe(true)
    expect(result.data?.email).toBe('ana@exemplo.com')
  })

  it('nao aplica trim nem regras de composicao na senha do login', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', senha: '  curta  ', manterSessao: false })
    expect(result.success).toBe(true)
    expect(result.data?.senha).toBe('  curta  ')
  })

  it('exige e-mail e senha, com mensagem por campo', () => {
    const result = loginSchema.safeParse({ email: '', senha: '', manterSessao: false })
    expect(issuePaths(result)).toEqual(expect.arrayContaining(['email', 'senha']))
  })

  it('rejeita e-mail invalido ou acima de 254 caracteres', () => {
    expect(loginSchema.safeParse({ email: 'sem-arroba', senha: 'x', manterSessao: false }).success).toBe(false)
    const longo = `${'a'.repeat(250)}@b.com`
    expect(loginSchema.safeParse({ email: longo, senha: 'x', manterSessao: false }).success).toBe(false)
  })
})

describe('registerSchema (AUTH-002, CA-008)', () => {
  it('aceita um cadastro valido e normaliza o nome', () => {
    const result = registerSchema.safeParse({ ...validRegister, nomeCompleto: '  Ana    Maria  ' })
    expect(result.success).toBe(true)
    expect(result.data?.nomeCompleto).toBe('Ana Maria')
  })

  it('exige nome entre 2 e 120 caracteres', () => {
    expect(issuePaths(registerSchema.safeParse({ ...validRegister, nomeCompleto: 'A' }))).toContain('nomeCompleto')
    expect(
      issuePaths(registerSchema.safeParse({ ...validRegister, nomeCompleto: 'a'.repeat(121) })),
    ).toContain('nomeCompleto')
  })

  it('exige senha de 12 a 128 caracteres com maiuscula, minuscula, numero e especial', () => {
    const short = registerSchema.safeParse({ ...validRegister, senha: 'curta123', confirmarSenha: 'curta123' })
    expect(issuePaths(short)).toContain('senha')

    const tooLong = 'aB1!'.repeat(40)
    expect(registerSchema.safeParse({ ...validRegister, senha: tooLong, confirmarSenha: tooLong }).success).toBe(false)
  })

  it.each([
    ['maiuscula', 'minha-senha-forte-2026'],
    ['minuscula', 'MINHA-SENHA-FORTE-2026'],
    ['numero', 'Minha-Senha-Forte-Segura'],
    ['especial', 'MinhaSenhaForte2026'],
  ])('rejeita senha sem %s', (_regra, senha) => {
    const result = registerSchema.safeParse({ ...validRegister, senha, confirmarSenha: senha })
    expect(issuePaths(result)).toEqual(['senha'])
  })

  it('exige confirmacao de senha igual', () => {
    const result = registerSchema.safeParse({ ...validRegister, confirmarSenha: 'outra coisa qualquer' })
    expect(issuePaths(result)).toEqual(['confirmarSenha'])
  })

  it('exige aceite dos termos', () => {
    expect(issuePaths(registerSchema.safeParse({ ...validRegister, aceiteTermos: false }))).toContain('aceiteTermos')
  })
})

describe('forgotPasswordSchema (AUTH-003)', () => {
  it('exige apenas um e-mail valido', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'ana@exemplo.com' }).success).toBe(true)
    expect(forgotPasswordSchema.safeParse({ email: 'x' }).success).toBe(false)
  })
})

describe('resetPasswordSchema (AUTH-003)', () => {
  const ok = { senha: 'Nova-Frase-Longa-Segura-1', confirmarSenha: 'Nova-Frase-Longa-Segura-1' }

  it('aceita nova senha valida com confirmacao', () => {
    expect(resetPasswordSchema.safeParse(ok).success).toBe(true)
  })

  it('aplica a politica de tamanho e a confirmacao', () => {
    expect(issuePaths(resetPasswordSchema.safeParse({ senha: 'curta', confirmarSenha: 'curta' }))).toContain('senha')
    expect(issuePaths(resetPasswordSchema.safeParse({ ...ok, confirmarSenha: 'diferente da outra' }))).toEqual([
      'confirmarSenha',
    ])
  })
})

describe('mfaSchema (AUTH-004)', () => {
  it('modo TOTP exige 6 digitos', () => {
    expect(mfaSchema.safeParse({ modo: 'totp', codigo: '123456' }).success).toBe(true)
    expect(mfaSchema.safeParse({ modo: 'totp', codigo: '12345' }).success).toBe(false)
    expect(mfaSchema.safeParse({ modo: 'totp', codigo: 'abcdef' }).success).toBe(false)
  })

  it('modo recuperacao aceita XXXXX-XXXXX com ou sem hifen e caixa livre', () => {
    expect(mfaSchema.safeParse({ modo: 'recuperacao', codigo: 'ABCDE-FGH23' }).success).toBe(true)
    expect(mfaSchema.safeParse({ modo: 'recuperacao', codigo: 'abcde fgh23' }).success).toBe(true)
    expect(mfaSchema.safeParse({ modo: 'recuperacao', codigo: 'curto' }).success).toBe(false)
  })

  it('remove espacos do codigo TOTP', () => {
    expect(mfaSchema.safeParse({ modo: 'totp', codigo: ' 123456 ' }).data?.codigo).toBe('123456')
  })
})
