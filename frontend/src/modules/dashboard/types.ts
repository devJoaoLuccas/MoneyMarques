/** Contratos da API do painel financeiro (espelham o backend). Dinheiro: centavos inteiros como string. */

export type VisaoFinanceira = 'pessoal' | 'familiar'

export interface ReferenciaIndicador {
  tipo: 'periodo' | 'data'
  /** `AAAA-MM` (periodo) ou `AAAA-MM-DD` (data). */
  valor: string
}

export interface IndicadorFinanceiro {
  /** `null` = indisponivel (nunca exibir como zero). */
  valorCentavos: string | null
  escopo: VisaoFinanceira
  referencia: ReferenciaIndicador
  parcial: boolean
  observacao: string | null
}

export interface SerieTemporal {
  periodo: string
  receitasCentavos: string
  despesasCentavos: string
}

export interface DistribuicaoCategoria {
  categoriaUid: string | null
  nome: string
  valorCentavos: string
  /** Pontos-base: 2500 = 25,00%. */
  participacaoBp: number
}

export interface ResumoFinanceiro {
  periodoReferencia: string
  visao: VisaoFinanceira
  atualizadoEm: string
  moeda: 'BRL'
  indisponivel: boolean
  semDados: boolean
  indicadores: {
    patrimonioLiquido: IndicadorFinanceiro
    saldoDisponivelContas: IndicadorFinanceiro
    receitasMes: IndicadorFinanceiro
    despesasMes: IndicadorFinanceiro
    saldoProjetadoMes: IndicadorFinanceiro
  }
  taxaPoupancaBp: number | null
  receitasDespesas: SerieTemporal[]
  despesasPorCategoria: DistribuicaoCategoria[]
}

export interface TotaisPeriodo {
  receitasCentavos: string
  despesasCentavos: string
  resultadoCentavos: string
}

export interface LancamentoMaior {
  descricao: string
  valorCentavos: string
  /** `AAAA-MM-DD`. */
  data: string
  origem: 'lancamento' | 'cartao'
  categoria: string
}

interface RespostaPainel {
  periodoReferencia: string
  visao: VisaoFinanceira
  atualizadoEm: string
  moeda: 'BRL'
  indisponivel: boolean
}

export interface ReceitasDespesas extends RespostaPainel {
  atual: TotaisPeriodo
  anterior: TotaisPeriodo
  variacaoReceitasBp: number | null
  variacaoDespesasBp: number | null
  previsto: { receitasCentavos: string; despesasCentavos: string }
  serie: SerieTemporal[]
  despesasPorCategoria: DistribuicaoCategoria[]
  receitasPorCategoria: DistribuicaoCategoria[]
  maioresLancamentos: LancamentoMaior[]
  categoriaFiltrada: string | null
}

export type StatusCompromisso = 'previsto' | 'pendente' | 'pago' | 'vencido'

export interface FaturaResumo {
  uid: string
  competencia: string
  dataFechamento: string
  dataVencimento: string
  situacao: string
  status: StatusCompromisso
  totalCentavos: string
  saldoDevedorCentavos: string
}

export interface CartaoPainel {
  uid: string
  nome: string
  emissor: string | null
  bandeira: string | null
  identificadorMascarado: string | null
  situacao: 'ATIVO' | 'BLOQUEADO'
  limiteCentavos: string
  utilizadoCentavos: string
  disponivelCentavos: string
  diaFechamento: number
  diaVencimento: number
  faturaAberta: FaturaResumo | null
  proximasFaturas: FaturaResumo[]
}

export interface CartoesPainel extends RespostaPainel {
  cartoes: CartaoPainel[]
  totais: { limiteCentavos: string; utilizadoCentavos: string; disponivelCentavos: string }
}

export interface Participacao {
  nome: string
  valorCentavos: string
  participacaoBp: number
}

export interface Patrimonio extends RespostaPainel {
  patrimonioBrutoCentavos: string | null
  passivosCentavos: string
  patrimonioLiquidoCentavos: string | null
  contasCentavos: string | null
  totalInvestidoCentavos: string | null
  ultimaAtualizacaoInvestimentos: string | null
  porInstituicao: Participacao[]
  porClasse: Participacao[]
  evolucaoAtivos: { periodo: string; ativosCentavos: string | null }[]
}

export interface ProjecaoMes {
  periodo: string
  saldoInicialCentavos: string
  entradasPrevistasCentavos: string
  saidasPrevistasCentavos: string
  saldoFinalCentavos: string
}

export interface DiaFluxo {
  data: string
  entradasPrevistasCentavos: string
  saidasPrevistasCentavos: string
  saldoCentavos: string
}

export interface Projecoes extends RespostaPainel {
  saldoInicialCentavos: string | null
  meses: ProjecaoMes[]
  fluxoDiarioMesAtual: DiaFluxo[]
  menorSaldoMesAtual: DiaFluxo | null
  observacao: string
}

export interface Compromisso {
  uid: string
  origem: 'lancamento' | 'fatura'
  tipo: 'RECEITA' | 'DESPESA' | 'FATURA'
  descricao: string
  valorCentavos: string
  competencia: string
  vencimento: string
  status: StatusCompromisso
}

export interface Vencimentos extends RespostaPainel {
  itens: Compromisso[]
  truncado: boolean
}

export type TipoAlerta =
  'vencimento_proximo' | 'conta_vencida' | 'projecao_negativa' | 'orcamento_excedido' | 'fatura_proxima'

export interface Alerta {
  tipo: TipoAlerta
  gravidade: 'INFORMATIVO' | 'ATENCAO' | 'CRITICO'
  descricao: string
}

export interface Alertas extends RespostaPainel {
  alertas: Alerta[]
}
