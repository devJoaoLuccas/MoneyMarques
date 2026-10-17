import type { VisaoFinanceira } from './domain/recursos-visiveis';

/** Referencia temporal de um indicador: um mes (`AAAA-MM`) ou uma data civil (`AAAA-MM-DD`). */
export interface ReferenciaDto {
  tipo: 'periodo' | 'data';
  valor: string;
}

/**
 * Valores monetarios em centavos inteiros como string (BigInt nao serializa em
 * JSON e `number` perderia precisao). `null` = valor indisponivel: nunca zero
 * quando o significado e desconhecido.
 */
export interface IndicadorFinanceiroDto {
  valorCentavos: string | null;
  escopo: VisaoFinanceira;
  referencia: ReferenciaDto;
  /** O indicador nao considera todas as fontes (ver `observacao`). */
  parcial: boolean;
  observacao: string | null;
}

export interface SerieTemporalDto {
  periodo: string;
  receitasCentavos: string;
  despesasCentavos: string;
}

export interface DistribuicaoCategoriaDto {
  categoriaUid: string | null;
  nome: string;
  valorCentavos: string;
  participacaoBp: number;
}

/** Contrato comum: toda resposta do painel declara periodo, visao, atualizacao e moeda. */
export interface RespostaPainelDto {
  periodoReferencia: string;
  visao: VisaoFinanceira;
  atualizadoEm: string;
  moeda: 'BRL';
  indisponivel: boolean;
}

export interface ResumoFinanceiroDto extends RespostaPainelDto {
  /** Nenhum recurso financeiro autorizado nesta visao: a UI mostra o estado vazio. */
  semDados: boolean;
  indicadores: {
    patrimonioLiquido: IndicadorFinanceiroDto;
    saldoDisponivelContas: IndicadorFinanceiroDto;
    receitasMes: IndicadorFinanceiroDto;
    despesasMes: IndicadorFinanceiroDto;
    saldoProjetadoMes: IndicadorFinanceiroDto;
  };
  taxaPoupancaBp: number | null;
  /** Ultimos 6 meses terminando no periodo, do mais antigo ao mais recente. */
  receitasDespesas: SerieTemporalDto[];
  despesasPorCategoria: DistribuicaoCategoriaDto[];
}

// ─── DASH-002: receitas e despesas ──────────────────────────────────────────
export interface TotaisPeriodoDto {
  receitasCentavos: string;
  despesasCentavos: string;
  /** Receitas - despesas realizadas. */
  resultadoCentavos: string;
}

export interface LancamentoMaiorDto {
  descricao: string;
  valorCentavos: string;
  /** Data civil `AAAA-MM-DD` (liquidacao ou compra no cartao). */
  data: string;
  origem: 'lancamento' | 'cartao';
  categoria: string;
}

export interface ReceitasDespesasDto extends RespostaPainelDto {
  atual: TotaisPeriodoDto;
  anterior: TotaisPeriodoDto;
  /** Pontos-base; nulo quando o periodo anterior e zero. */
  variacaoReceitasBp: number | null;
  variacaoDespesasBp: number | null;
  /** Previsto do mes (lancamentos em aberto que vencem no periodo): nunca somado ao realizado. */
  previsto: { receitasCentavos: string; despesasCentavos: string };
  serie: SerieTemporalDto[];
  despesasPorCategoria: DistribuicaoCategoriaDto[];
  receitasPorCategoria: DistribuicaoCategoriaDto[];
  maioresLancamentos: LancamentoMaiorDto[];
  categoriaFiltrada: string | null;
}

// ─── DASH-003: cartoes e faturas ────────────────────────────────────────────
export type StatusCompromissoDto = 'previsto' | 'pendente' | 'pago' | 'vencido';

export interface FaturaResumoDto {
  uid: string;
  competencia: string;
  dataFechamento: string;
  dataVencimento: string;
  situacao: string;
  status: StatusCompromissoDto;
  totalCentavos: string;
  saldoDevedorCentavos: string;
}

export interface CartaoPainelDto {
  uid: string;
  nome: string;
  emissor: string | null;
  bandeira: string | null;
  /** Somente os ultimos digitos; nunca o numero completo. */
  identificadorMascarado: string | null;
  situacao: 'ATIVO' | 'BLOQUEADO';
  limiteCentavos: string;
  utilizadoCentavos: string;
  /** Limite - utilizado. Limite de credito NAO e saldo disponivel. */
  disponivelCentavos: string;
  diaFechamento: number;
  diaVencimento: number;
  faturaAberta: FaturaResumoDto | null;
  proximasFaturas: FaturaResumoDto[];
}

export interface CartoesPainelDto extends RespostaPainelDto {
  cartoes: CartaoPainelDto[];
  totais: {
    limiteCentavos: string;
    utilizadoCentavos: string;
    disponivelCentavos: string;
  };
}

// ─── DASH-004: patrimonio ───────────────────────────────────────────────────
export interface ParticipacaoDto {
  nome: string;
  valorCentavos: string;
  participacaoBp: number;
}

export interface PatrimonioDto extends RespostaPainelDto {
  patrimonioBrutoCentavos: string | null;
  passivosCentavos: string;
  patrimonioLiquidoCentavos: string | null;
  contasCentavos: string | null;
  totalInvestidoCentavos: string | null;
  /** Data civil da ultima atualizacao MANUAL de um investimento; nunca inventamos preco ou rentabilidade. */
  ultimaAtualizacaoInvestimentos: string | null;
  porInstituicao: ParticipacaoDto[];
  porClasse: ParticipacaoDto[];
  /** Evolucao dos ativos (contas + investimentos) ao fim de cada mes; passivos nao tem historico. */
  evolucaoAtivos: { periodo: string; ativosCentavos: string | null }[];
}

// ─── DASH-005: projecoes ────────────────────────────────────────────────────
export interface ProjecaoMesDto {
  periodo: string;
  saldoInicialCentavos: string;
  entradasPrevistasCentavos: string;
  saidasPrevistasCentavos: string;
  saldoFinalCentavos: string;
}

export interface DiaFluxoDto {
  data: string;
  entradasPrevistasCentavos: string;
  saidasPrevistasCentavos: string;
  saldoCentavos: string;
}

export interface ProjecoesDto extends RespostaPainelDto {
  /** `null` quando nao ha conta autorizada: sem saldo inicial nao ha projecao. */
  saldoInicialCentavos: string | null;
  meses: ProjecaoMesDto[];
  fluxoDiarioMesAtual: DiaFluxoDto[];
  menorSaldoMesAtual: DiaFluxoDto | null;
  observacao: string;
}

// ─── DASH-006: vencimentos e alertas ────────────────────────────────────────
export interface CompromissoDto {
  uid: string;
  origem: 'lancamento' | 'fatura';
  tipo: 'RECEITA' | 'DESPESA' | 'FATURA';
  descricao: string;
  valorCentavos: string;
  competencia: string;
  vencimento: string;
  status: StatusCompromissoDto;
}

export interface VencimentosDto extends RespostaPainelDto {
  itens: CompromissoDto[];
  /** Tem mais itens do que o limite de uma resposta. */
  truncado: boolean;
}

export type TipoAlerta =
  | 'vencimento_proximo'
  | 'conta_vencida'
  | 'projecao_negativa'
  | 'orcamento_excedido'
  | 'fatura_proxima';

export interface AlertaDto {
  tipo: TipoAlerta;
  gravidade: 'INFORMATIVO' | 'ATENCAO' | 'CRITICO';
  descricao: string;
}

export interface AlertasDto extends RespostaPainelDto {
  alertas: AlertaDto[];
}
