export const HORIZONTES = [
  { valor: 1, rotulo: 'Mês atual' },
  { valor: 3, rotulo: '3 meses' },
  { valor: 6, rotulo: '6 meses' },
  { valor: 12, rotulo: '12 meses' },
] as const

export function horizonteDaUrl(bruto: string | null): number {
  const valor = Number(bruto)
  return HORIZONTES.some((h) => h.valor === valor) ? valor : 12
}
