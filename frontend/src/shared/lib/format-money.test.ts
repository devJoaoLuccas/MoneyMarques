import { describe, expect, it } from 'vitest'
import { formatCentavos, MASCARA_VALOR } from './format-money'

describe('formatCentavos', () => {
  it.each([
    ['125000', 'R$ 1.250,00'],
    ['0', 'R$ 0,00'],
    ['5', 'R$ 0,05'],
    ['-12345', '-R$ 123,45'],
    ['100000000', 'R$ 1.000.000,00'],
  ])('formata %s', (entrada, esperado) => {
    expect(formatCentavos(entrada)).toBe(esperado)
  })

  it('preserva precisao acima do limite seguro de ponto flutuante', () => {
    expect(formatCentavos('900719925474099199')).toBe('R$ 9.007.199.254.740.991,99')
  })

  it('a mascara nao revela nenhum digito', () => {
    expect(MASCARA_VALOR).not.toMatch(/\d/)
  })
})
