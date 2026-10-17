import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { participacaoBp, somar } from './domain/indicadores';
import {
  chaveDataCivil,
  janelaDoMes,
  ultimoDiaCivil,
  ultimosPeriodos,
} from './domain/periodo';
import type { ContextoFinanceiro } from './politica-acesso-financeiro';
import { RepositorioFinanceiro } from './repositorio-financeiro';
import { respostaBase, str } from './resposta';
import type { ParticipacaoDto, PatrimonioDto } from './painel.types';

const MESES_EVOLUCAO = 6;

function agrupar(
  posicoes: ContextoFinanceiro['posicoes'],
  chave: 'instituicao' | 'classe',
  total: bigint,
) {
  const grupos = new Map<string, bigint>();
  for (const p of posicoes)
    grupos.set(
      p[chave],
      (grupos.get(p[chave]) ?? 0n) + p.valorReferenciaCentavos,
    );
  return [...grupos.entries()]
    .sort(([, a], [, b]) => (a === b ? 0 : a > b ? -1 : 1))
    .map(([nome, valor]): ParticipacaoDto => ({
      nome,
      valorCentavos: str(valor),
      participacaoBp: participacaoBp(valor, total),
    }));
}

/**
 * DASH-004: patrimonio bruto, passivos (faturas nao quitadas, D-DASH-002),
 * liquido, investido e evolucao. Investimentos sao informados MANUALMENTE:
 * exibimos a data da ultima atualizacao e nunca inventamos preco ou rentabilidade.
 */
@Injectable()
export class ServicoPatrimonio {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: RepositorioFinanceiro,
  ) {}

  async obter(
    ctx: ContextoFinanceiro,
    periodo: string,
  ): Promise<PatrimonioDto> {
    const [contas, naoQuitadas] = await Promise.all([
      this.repo.saldoContas(ctx),
      this.repo.faturasNaoQuitadas(ctx),
    ]);
    const investido = ctx.posicoes.length
      ? somar(ctx.posicoes.map((p) => p.valorReferenciaCentavos))
      : null;
    const bruto =
      contas === null && investido === null
        ? null
        : (contas ?? 0n) + (investido ?? 0n);
    const passivos = somar(naoQuitadas.map((f) => f.saldoDevedorCentavos));
    const datas = ctx.posicoes.flatMap((p) =>
      p.dataReferencia ? [p.dataReferencia] : [],
    );
    const ultima = datas.length
      ? new Date(Math.max(...datas.map((d) => d.getTime())))
      : null;

    return {
      ...respostaBase(ctx, periodo),
      patrimonioBrutoCentavos: bruto === null ? null : str(bruto),
      passivosCentavos: str(passivos),
      patrimonioLiquidoCentavos: bruto === null ? null : str(bruto - passivos),
      contasCentavos: contas === null ? null : str(contas),
      totalInvestidoCentavos: investido === null ? null : str(investido),
      ultimaAtualizacaoInvestimentos: ultima ? chaveDataCivil(ultima) : null,
      porInstituicao:
        investido === null
          ? []
          : agrupar(ctx.posicoes, 'instituicao', investido),
      porClasse:
        investido === null ? [] : agrupar(ctx.posicoes, 'classe', investido),
      evolucaoAtivos: await this.evolucao(ctx, periodo),
    };
  }

  /** Ativos ao fim de cada mes: saldo das contas naquele instante + ultimo valor registrado de cada posicao. */
  private async evolucao(ctx: ContextoFinanceiro, periodo: string) {
    const meses = ultimosPeriodos(periodo, MESES_EVOLUCAO);
    const historico = ctx.posicoes.length
      ? await this.prisma.historicoValorPosicao.findMany({
          where: {
            posicaoUid: { in: ctx.posicoes.map((p) => p.uid) },
            dataReferencia: { lte: ultimoDiaCivil(periodo) },
          },
          orderBy: { dataReferencia: 'asc' },
          select: {
            posicaoUid: true,
            valorCentavos: true,
            dataReferencia: true,
          },
        })
      : [];

    const resultado: { periodo: string; ativosCentavos: string | null }[] = [];
    for (const mes of meses) {
      const contas = await this.repo.saldoContas(
        ctx,
        janelaDoMes(mes).fimExclusivo,
      );
      const limite = ultimoDiaCivil(mes);
      const ultimoPorPosicao = new Map<string, bigint>();
      for (const h of historico) {
        if (h.dataReferencia <= limite)
          ultimoPorPosicao.set(h.posicaoUid, h.valorCentavos);
      }
      const investidos = [...ultimoPorPosicao.values()];
      const total =
        contas === null && investidos.length === 0
          ? null
          : (contas ?? 0n) + somar(investidos);
      resultado.push({
        periodo: mes,
        ativosCentavos: total === null ? null : str(total),
      });
    }
    return resultado;
  }
}
