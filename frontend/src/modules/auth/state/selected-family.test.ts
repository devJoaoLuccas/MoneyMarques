import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearSelectedFamily, getSelectedFamily, setSelectedFamily } from './selected-family'

describe('selected-family (AUTH-005: apenas orienta a navegacao)', () => {
  afterEach(() => window.sessionStorage.clear())

  it('guarda e le a familia escolhida na sessao do navegador', () => {
    expect(getSelectedFamily()).toBeNull()
    setSelectedFamily('f1')
    expect(getSelectedFamily()).toBe('f1')
  })

  it('limpa a escolha (logout / sessao expirada)', () => {
    setSelectedFamily('f1')
    clearSelectedFamily()
    expect(getSelectedFamily()).toBeNull()
  })

  it('nao quebra quando o storage esta bloqueado (modo privado)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(getSelectedFamily()).toBeNull()
    expect(() => setSelectedFamily('f1')).not.toThrow()
  })

  it('nunca usa localStorage (so dados da aba)', () => {
    setSelectedFamily('f1')
    expect(window.localStorage.length).toBe(0)
  })
})
