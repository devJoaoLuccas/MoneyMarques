import { describe, expect, it } from 'vitest'
import { createFamilySchema, inviteSchema } from './family.schemas'

const valid = { nome: 'Família Silva', descricao: '', avatar: 'casa' as const }

describe('createFamilySchema (FAM-001)', () => {
  it('aceita e normaliza espacos do nome e da descricao', () => {
    const result = createFamilySchema.safeParse({ ...valid, nome: '  Família   Silva ', descricao: ' Casa   nova ' })
    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({ nome: 'Família Silva', descricao: 'Casa nova' })
  })

  it('exige nome entre 3 e 40 caracteres (apos normalizar)', () => {
    expect(createFamilySchema.safeParse({ ...valid, nome: 'ab' }).success).toBe(false)
    expect(createFamilySchema.safeParse({ ...valid, nome: '   a   ' }).success).toBe(false)
    expect(createFamilySchema.safeParse({ ...valid, nome: 'abc' }).success).toBe(true)
    expect(createFamilySchema.safeParse({ ...valid, nome: 'a'.repeat(40) }).success).toBe(true)
    expect(createFamilySchema.safeParse({ ...valid, nome: 'a'.repeat(41) }).success).toBe(false)
  })

  it('limita a descricao a 240 caracteres', () => {
    expect(createFamilySchema.safeParse({ ...valid, descricao: 'x'.repeat(240) }).success).toBe(true)
    expect(createFamilySchema.safeParse({ ...valid, descricao: 'x'.repeat(241) }).success).toBe(false)
  })

  it('aceita apenas os icones predefinidos', () => {
    expect(createFamilySchema.safeParse({ ...valid, avatar: 'familia' }).success).toBe(true)
    expect(createFamilySchema.safeParse({ ...valid, avatar: 'http://x/y.png' }).success).toBe(false)
  })
})

describe('inviteSchema (FAM-005)', () => {
  it('normaliza o e-mail e aceita os tres papeis', () => {
    const result = inviteSchema.safeParse({ email: '  bruno@exemplo.com ', papel: 'VISUALIZADOR' })
    expect(result.success).toBe(true)
    expect(result.data?.email).toBe('bruno@exemplo.com')
  })

  it('rejeita e-mail vazio, invalido ou papel desconhecido', () => {
    expect(inviteSchema.safeParse({ email: '', papel: 'INTEGRANTE' }).success).toBe(false)
    expect(inviteSchema.safeParse({ email: 'sem-arroba', papel: 'INTEGRANTE' }).success).toBe(false)
    expect(inviteSchema.safeParse({ email: 'a@b.com', papel: 'SUPERUSER' }).success).toBe(false)
  })
})
