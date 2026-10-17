const formatador = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Pontos-base (2500 = 25,0%) para texto: nao e dinheiro, entao nao passa pela mascara de valores. */
export function formatarPercentualBp(bp: number): string {
  return `${formatador.format(bp / 100)}%`
}

/** Variacao com sinal explicito (+12,0% / -5,0%): o sentido nunca depende so de cor. */
export function formatarVariacaoBp(bp: number): string {
  return `${bp > 0 ? '+' : ''}${formatarPercentualBp(bp)}`
}
