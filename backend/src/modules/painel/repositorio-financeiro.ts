import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { saldoDevedorFatura, totalFatura } from './domain/fatura';
import { somar } from './domain/indicadores';
import { inicioDoDiaCivil, ultimoDiaCivil } from './domain/periodo';
import type { ContextoFinanceiro } from './politica-acesso-financeiro';

const CATEGORIA = {
  select: { nome: true, titularUid: true, visibilidade: true },
} as const;

export interface FaturaCalculada {
  uid: string;
  cartaoUid: string;
  competencia: Date;
  dataFechamento: Date;
  dataVencimento: Date;
  situacao: 'ABERTA' | 'FECHADA' | 'PARCIALMENTE_PAGA' | 'PAGA' | 'CANCELADA';
  parcelasCentavos: bigint;
  totalCentavos: bigint;
  pagoCentavos: bigint;
  saldoDevedorCentavos: bigint;
}

export interface LancamentoAberto {
  uid: string;
  tipo: 'RECEITA' | 'DESPESA';
  descricao: string;
  categoriaUid: string | null;
  valorCentavos: bigint;
  restanteCentavos: bigint;
  competencia: Date;
  vencimento: Date;
  situacao:
    | 'PREVISTO'
    | 'PENDENTE'
    | 'PARCIALMENTE_LIQUIDADO'
    | 'LIQUIDADO'
    | 'CANCELADO';
}

/**
 * Consultas agregadas do painel. Todas recebem o ContextoFinanceiro ja
 * autorizado: so tocam contas, cartoes e lancamentos que a politica liberou.
 * Valores monetarios saem como BigInt.
 */
@Injectable()
export class RepositorioFinanceiro {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Saldo = saldo inicial + movimentacoes a partir da data do saldo inicial
   * (nao e coluna). Com `ate`, o saldo no instante (exclusivo); contas ainda
   * sem saldo inicial naquele instante nao entram. Nulo se nenhuma conta conta.
   */
  async saldoContas(
    ctx: ContextoFinanceiro,
    ate?: Date,
  ): Promise<bigint | null> {
    const contas = ate
      ? ctx.contas.filter((c) => inicioDoDiaCivil(c.dataSaldoInicial) < ate)
      : ctx.contas;
    if (contas.length === 0) return null;
    const grupos = await this.prisma.movimentacaoConta.groupBy({
      by: ['contaUid'],
      where: {
        OR: contas.map((c) => ({
          contaUid: c.uid,
          dataEfetivacao: {
            gte: inicioDoDiaCivil(c.dataSaldoInicial),
            ...(ate ? { lt: ate } : {}),
          },
        })),
      },
      _sum: { valorCentavos: true },
    });
    return (
      somar(contas.map((c) => c.saldoInicialCentavos)) +
      somar(grupos.map((g) => g._sum.valorCentavos ?? 0n))
    );
  }

  /** Realizado: liquidacoes confirmadas (estornadas saem) em contas autorizadas. */
  async liquidacoes(ctx: ContextoFinanceiro, de: Date, ate: Date) {
    if (ctx.contas.length === 0) return [];
    return this.prisma.liquidacaoLancamento.findMany({
      where: {
        situacao: 'CONFIRMADA',
        liquidadoEm: { gte: de, lt: ate },
        movimentacao: { contaUid: { in: ctx.contas.map((c) => c.uid) } },
        lancamento: ctx.filtroLancamento,
      },
      select: {
        valorCentavos: true,
        liquidadoEm: true,
        lancamento: {
          select: {
            uid: true,
            tipo: true,
            descricao: true,
            categoriaUid: true,
            categoria: CATEGORIA,
          },
        },
      },
    });
  }

  /**
   * Despesa de cartao reconhecida pela competencia da parcela (D-DASH-001):
   * parcelas de compras ATIVAS cuja fatura tem competencia no intervalo
   * [de, ateExclusivo). A compra respeita o orcamento da visao (pessoal x familiar).
   */
  async parcelasReconhecidas(
    ctx: ContextoFinanceiro,
    de: Date,
    ateExclusivo: Date,
  ) {
    if (ctx.cartoes.length === 0) return [];
    return this.prisma.parcelaCompra.findMany({
      where: {
        fatura: {
          competencia: { gte: de, lt: ateExclusivo },
          situacao: { not: 'CANCELADA' },
        },
        compra: {
          situacao: 'ATIVA',
          escopoOrcamento: ctx.escopoOrcamento,
          cartaoUid: { in: ctx.cartoes.map((c) => c.uid) },
        },
      },
      select: {
        valorCentavos: true,
        fatura: { select: { competencia: true } },
        compra: {
          select: {
            uid: true,
            descricao: true,
            dataCompra: true,
            categoriaUid: true,
            categoria: CATEGORIA,
          },
        },
      },
    });
  }

  async faturas(
    ctx: ContextoFinanceiro,
    filtro: Prisma.FaturaCartaoWhereInput = {},
  ): Promise<FaturaCalculada[]> {
    if (ctx.cartoes.length === 0) return [];
    const faturas = await this.prisma.faturaCartao.findMany({
      where: { cartaoUid: { in: ctx.cartoes.map((c) => c.uid) }, ...filtro },
      orderBy: [{ dataVencimento: 'asc' }, { competencia: 'asc' }],
      select: {
        uid: true,
        cartaoUid: true,
        competencia: true,
        dataFechamento: true,
        dataVencimento: true,
        situacao: true,
        parcelas: {
          where: { compra: { situacao: 'ATIVA' } },
          select: { valorCentavos: true },
        },
        ajustes: { select: { tipo: true, valorCentavos: true } },
        pagamentos: {
          where: { situacao: 'CONFIRMADO' },
          select: { valorCentavos: true },
        },
      },
    });
    return faturas.map((f) => {
      const entrada = {
        parcelas: f.parcelas.map((p) => p.valorCentavos),
        ajustes: f.ajustes,
        pagamentos: f.pagamentos.map((p) => p.valorCentavos),
      };
      return {
        uid: f.uid,
        cartaoUid: f.cartaoUid,
        competencia: f.competencia,
        dataFechamento: f.dataFechamento,
        dataVencimento: f.dataVencimento,
        situacao: f.situacao,
        parcelasCentavos: somar(entrada.parcelas),
        totalCentavos: totalFatura(entrada),
        pagoCentavos: somar(entrada.pagamentos),
        saldoDevedorCentavos: saldoDevedorFatura(entrada),
      };
    });
  }

  /** Passivos do patrimonio (D-DASH-002): faturas ainda nao quitadas. */
  faturasNaoQuitadas(ctx: ContextoFinanceiro): Promise<FaturaCalculada[]> {
    return this.faturas(ctx, { situacao: { notIn: ['PAGA', 'CANCELADA'] } });
  }

  /** Previsto: o que falta liquidar, vencido ou ate o fim de `periodo` (por vencimento; sem ele, competencia). */
  async lancamentosAbertos(
    ctx: ContextoFinanceiro,
    periodo: string,
  ): Promise<LancamentoAberto[]> {
    const limite = ultimoDiaCivil(periodo);
    const abertos = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        AND: [
          ctx.filtroLancamento,
          {
            situacao: {
              in: ['PREVISTO', 'PENDENTE', 'PARCIALMENTE_LIQUIDADO'],
            },
            OR: [
              { vencimento: { lte: limite } },
              { vencimento: null, competencia: { lte: limite } },
            ],
          },
        ],
      },
      select: {
        uid: true,
        tipo: true,
        descricao: true,
        categoriaUid: true,
        valorCentavos: true,
        competencia: true,
        vencimento: true,
        situacao: true,
        liquidacoes: {
          where: { situacao: 'CONFIRMADA' },
          select: { valorCentavos: true },
        },
      },
    });
    return abertos.map((a) => {
      const restante =
        a.valorCentavos - somar(a.liquidacoes.map((l) => l.valorCentavos));
      return {
        uid: a.uid,
        tipo: a.tipo,
        descricao: a.descricao,
        categoriaUid: a.categoriaUid,
        valorCentavos: a.valorCentavos,
        restanteCentavos: restante > 0n ? restante : 0n,
        competencia: a.competencia,
        vencimento: a.vencimento ?? a.competencia,
        situacao: a.situacao,
      };
    });
  }
}
