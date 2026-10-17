/** Texto exibido no lugar de qualquer valor quando "ocultar valores" esta ativo. */
export const MASCARA_VALOR = 'R$ ••••'

const agrupador = new Intl.NumberFormat('pt-BR')

/**
 * BRL a partir de centavos inteiros (string vinda da API ou bigint): `R$ 1.250,00`.
 * Aritmetica inteira (BigInt), sem passar por ponto flutuante (CA-DASH-024).
 */
export function formatCentavos(centavos: string | bigint): string {
  const valor = BigInt(centavos)
  const negativo = valor < 0n
  const absoluto = negativo ? -valor : valor
  const reais = agrupador.format(absoluto / 100n)
  const resto = (absoluto % 100n).toString().padStart(2, '0')
  return `${negativo ? '-' : ''}R$\u00a0${reais},${resto}`
}
