import { describe, expect, it } from 'vitest'
import { formatarPercentualBp, formatarVariacaoBp } from './format-percent'

describe('format-percent', () => {
  it('formata pontos-base no padrao brasileiro', () => {
    expect(formatarPercentualBp(2500)).toBe('25,0%')
    expect(formatarPercentualBp(1)).toBe('0,0%')
  })
  it('variacao tem sinal explicito', () => {
    expect(formatarVariacaoBp(1250)).toBe('+12,5%')
    expect(formatarVariacaoBp(-500)).toBe('-5,0%')
    expect(formatarVariacaoBp(0)).toBe('0,0%')
  })
})
