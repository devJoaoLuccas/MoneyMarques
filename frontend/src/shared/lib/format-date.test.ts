import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime } from './format-date'

describe('formatDate', () => {
  it('formata como DD/MM/AAAA em UTC', () => {
    expect(formatDate('2026-10-05T03:00:00.000Z')).toBe('05/10/2026')
    expect(formatDate('2026-12-31T23:59:59.000Z')).toBe('31/12/2026')
  })
})

describe('formatDateTime', () => {
  it('usa o fuso da interface (America/Bahia, UTC-3)', () => {
    expect(formatDateTime('2026-10-18T01:30:00.000Z')).toBe('17/10/2026 22:30')
  })
})
