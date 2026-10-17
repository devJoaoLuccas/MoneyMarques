import { describe, expect, it } from 'vitest'
import { readTokenFromHash } from './url-token'

describe('readTokenFromHash (token no fragmento da URL, nunca na query)', () => {
  it('le o token de #token=...', () => {
    expect(readTokenFromHash('#token=abc_123-XYZ')).toBe('abc_123-XYZ')
  })

  it('devolve null sem fragmento, vazio ou sem a chave token', () => {
    expect(readTokenFromHash('')).toBeNull()
    expect(readTokenFromHash('#')).toBeNull()
    expect(readTokenFromHash('#outro=1')).toBeNull()
  })

  it('ignora o token quando vem na query string (nao e o formato dos nossos e-mails)', () => {
    expect(readTokenFromHash('?token=abc')).toBeNull()
  })
})
