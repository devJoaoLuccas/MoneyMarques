/**
 * Formulas do painel (guia secao 6). Valores monetarios sao centavos em
 * BigInt; percentuais saem em pontos-base (1% = 100) como inteiro, entao nunca
 * ha ponto flutuante em soma monetaria (CA-DASH-024).
 */
export function somar(valores: readonly bigint[]): bigint {
  return valores.reduce((total, valor) => total + valor, 0n);
}

/** saldoFinal = saldoInicial + receitasPrevistas - saidasPrevistas. */
export function saldoProjetadoFinal(
  saldoInicial: bigint,
  receitasPrevistas: bigint,
  saidasPrevistas: bigint,
): bigint {
  return saldoInicial + receitasPrevistas - saidasPrevistas;
}

/** Divisao inteira arredondada (meio afasta de zero) de numerador/denominador * 10000. */
function razaoBp(numerador: bigint, denominador: bigint): number {
  const escalado = numerador * 10_000n;
  const metade = denominador / 2n;
  const quociente =
    escalado >= 0n
      ? (escalado + metade) / denominador
      : (escalado - metade) / denominador;
  return Number(quociente);
}

/** TaxaPoupanca = (receitas - despesas) / receitas; indisponivel se receitas <= 0. */
export function taxaPoupancaBp(
  receitas: bigint,
  despesas: bigint,
): number | null {
  if (receitas <= 0n) return null;
  return razaoBp(receitas - despesas, receitas);
}

/** Variacao = (atual - anterior) / anterior; indisponivel se anterior = 0. */
export function variacaoPercentualBp(
  atual: bigint,
  anterior: bigint,
): number | null {
  if (anterior === 0n) return null;
  return razaoBp(atual - anterior, anterior < 0n ? -anterior : anterior);
}

/** Participacao de `parte` no `total`, em pontos-base; 0 quando o total nao e positivo. */
export function participacaoBp(parte: bigint, total: bigint): number {
  return total > 0n ? razaoBp(parte, total) : 0;
}
