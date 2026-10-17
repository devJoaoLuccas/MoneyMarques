import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { statusFatura, statusLancamento } from './domain/fatura';
import { somar } from './domain/indicadores';
import {
  chaveDataCivil,
  periodoDaDataCivil,
  primeiroDiaCivil,
  ultimoDiaCivil,
} from './domain/periodo';
import type { ContextoFinanceiro } from './politica-acesso-financeiro';
import { RepositorioFinanceiro } from './repositorio-financeiro';
import { respostaBase, str } from './resposta';
import type { CompromissoDto, VencimentosDto } from './painel.types';

export const LIMITE_VENCIMENTOS = 200;

/**
 * DASH-006: compromissos do periodo (lancamentos e faturas) ordenados por
 * vencimento, mais tudo o que ja esta vencido e nao foi quitado. "Marcar como
 * pago" NAO acontece aqui: o painel so consulta; a operacao e transacional.
 */
@Injectable()
export class ServicoVencimentos {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: RepositorioFinanceiro,
  ) {}

  async listar(
    ctx: ContextoFinanceiro,
    periodo: string,
  ): Promise<CompromissoDto[]> {
    const primeiro = primeiroDiaCivil(periodo);
    const ultimo = ultimoDiaCivil(periodo);
    const hoje = chaveDataCivil(ctx.hojeCivil);

    const [lancamentos, faturas] = await Promise.all([
      this.prisma.lancamentoFinanceiro.findMany({
        where: {
          AND: [
            ctx.filtroLancamento,
            { situacao: { not: 'CANCELADO' } },
            {
              OR: [
                { vencimento: { gte: primeiro, lte: ultimo } },
                {
                  vencimento: null,
                  competencia: { gte: primeiro, lte: ultimo },
                },
                {
                  vencimento: { lt: primeiro },
                  situacao: {
                    in: ['PREVISTO', 'PENDENTE', 'PARCIALMENTE_LIQUIDADO'],
                  },
                },
              ],
            },
          ],
        },
        select: {
          uid: true,
          tipo: true,
          descricao: true,
          valorCentavos: true,
          competencia: true,
          vencimento: true,
          situacao: true,
          liquidacoes: {
            where: { situacao: 'CONFIRMADA' },
            select: { valorCentavos: true },
          },
        },
      }),
      this.repo.faturas(ctx, {
        situacao: { not: 'CANCELADA' },
        OR: [
          { dataVencimento: { gte: primeiro, lte: ultimo } },
          { dataVencimento: { lt: primeiro }, situacao: { notIn: ['PAGA'] } },
        ],
      }),
    ]);

    const doLancamento: CompromissoDto[] = lancamentos.map((l) => {
      const vencimento = chaveDataCivil(l.vencimento ?? l.competencia);
      const restante =
        l.valorCentavos - somar(l.liquidacoes.map((x) => x.valorCentavos));
      return {
        uid: l.uid,
        origem: 'lancamento',
        tipo: l.tipo,
        descricao: l.descricao,
        valorCentavos: str(
          l.situacao === 'LIQUIDADO'
            ? l.valorCentavos
            : restante > 0n
              ? restante
              : 0n,
        ),
        competencia: periodoDaDataCivil(l.competencia),
        vencimento,
        status: statusLancamento(l.situacao, vencimento, hoje),
      };
    });
    const nomes = new Map(ctx.cartoes.map((c) => [c.uid, c.nome]));
    const daFatura: CompromissoDto[] = faturas.map((f) => ({
      uid: f.uid,
      origem: 'fatura',
      tipo: 'FATURA',
      descricao: `Fatura ${nomes.get(f.cartaoUid) ?? 'do cartão'}`,
      valorCentavos: str(
        f.situacao === 'PAGA' ? f.totalCentavos : f.saldoDevedorCentavos,
      ),
      competencia: periodoDaDataCivil(f.competencia),
      vencimento: chaveDataCivil(f.dataVencimento),
      status: statusFatura(f.situacao, chaveDataCivil(f.dataVencimento), hoje),
    }));

    return [...doLancamento, ...daFatura].sort((a, b) =>
      a.vencimento.localeCompare(b.vencimento),
    );
  }

  async obter(
    ctx: ContextoFinanceiro,
    periodo: string,
  ): Promise<VencimentosDto> {
    const todos = await this.listar(ctx, periodo);
    return {
      ...respostaBase(ctx, periodo),
      itens: todos.slice(0, LIMITE_VENCIMENTOS),
      truncado: todos.length > LIMITE_VENCIMENTOS,
    };
  }
}
