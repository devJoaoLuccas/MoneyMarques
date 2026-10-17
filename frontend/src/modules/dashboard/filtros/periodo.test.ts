import { describe, expect, it } from 'vitest'
import {
  dataCivilDe,
  deslocarPeriodo,
  formatarDataCivil,
  periodoAtual,
  periodoValido,
  rotuloPeriodo,
  rotuloPeriodoCurto,
} from './periodo'

describe('periodo', () => {
  it('o mes atual segue o fuso America/Bahia (UTC-3), nao o UTC', () => {
    expect(periodoAtual(new Date('2026-11-01T02:59:00Z'))).toBe('2026-10')
    expect(periodoAtual(new Date('2026-11-01T03:00:00Z'))).toBe('2026-11')
  })

  it('valida AAAA-MM', () => {
    expect(periodoValido('2026-10')).toBe(true)
    expect(periodoValido('2026-13')).toBe(false)
    expect(periodoValido('<script>')).toBe(false)
    expect(periodoValido(null)).toBe(false)
  })

  it('desloca meses atravessando anos', () => {
    expect(deslocarPeriodo('2026-01', -1)).toBe('2025-12')
    expect(deslocarPeriodo('2026-12', 1)).toBe('2027-01')
  })

  it('formata rotulos e datas no padrao brasileiro', () => {
    expect(rotuloPeriodo('2026-03')).toBe('Março de 2026')
    expect(rotuloPeriodoCurto('2026-10')).toBe('out/26')
    expect(formatarDataCivil('2026-10-17')).toBe('17/10/2026')
  })

  it('o dia civil tambem segue o fuso da interface', () => {
    expect(dataCivilDe(new Date('2026-10-18T01:00:00Z'))).toBe('2026-10-17')
  })
})
