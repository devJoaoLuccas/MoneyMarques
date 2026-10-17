import { Injectable } from '@nestjs/common';
import type { FamilyScope } from '../family/guards/family-context.guard';
import {
  agruparPorCategoria,
  type ItemCategorizado,
} from './domain/categorias';
import {
  saldoProjetadoFinal,
  somar,
  taxaPoupancaBp,
} from './domain/indicadores';
import {
  deslocarPeriodo,
  janelaDoMes,
  periodoDaDataCivil,
  periodoDoInstante,
  primeiroDiaCivil,
  chaveDataCivil,
  ultimoDiaCivil,
  ultimosPeriodos,
} from './domain/periodo';
import type { VisaoFinanceira } from './domain/recursos-visiveis';
import type { ConsultaPainelDto } from './dto/painel.dto';
import { PoliticaAcessoFinanceiro } from './politica-acesso-financeiro';
import { RepositorioFinanceiro } from './repositorio-financeiro';
import type {
  IndicadorFinanceiroDto,
  ReferenciaDto,
  ResumoFinanceiroDto,
  SerieTemporalDto,
} from './painel.types';

const MESES_SERIE = 6;

const OBS_PROJECAO_PASSADO =
  'A projeção só está disponível para o mês atual e meses futuros.';
const OBS_PROJECAO =
  'Considera apenas lançamentos e faturas já registrados; recorrências ainda não geradas não entram.';

const toStr = (valor: bigint | null): string | null =>
  valor === null ? null : valor.toString();

/**
 * ServicoResumoFinanceiro (DASH-001): consolida os indicadores do painel.
 * Autoriza antes de agregar (PoliticaAcessoFinanceiro) e so soma centavos em
 * BigInt. Realizado e previsto nunca se misturam. Despesa de cartao entra
 * pela competencia da parcela (D-DASH-001) e o pagamento da fatura nao conta
 * de novo; passivos = faturas nao quitadas (D-DASH-002). Sem fonte, o
 * indicador sai nulo ou parcial, com o motivo.
 */
@Injectable()
export class ServicoResumoFinanceiro {
  constructor(
    private readonly politica: PoliticaAcessoFinanceiro,
    private readonly repo: RepositorioFinanceiro,
  ) {}

  async obter(
    scope: FamilyScope,
    usuarioUid: string,
    consulta: ConsultaPainelDto,
    agora: Date = new Date(),
  ): Promise<ResumoFinanceiroDto> {
    const periodoAtual = periodoDoInstante(agora);
    const periodo = consulta.periodo ?? periodoAtual;
    const visao: VisaoFinanceira = consulta.visao ?? 'pessoal';
    const ctx = await this.politica.carregarContexto(
      scope,
      usuarioUid,
      visao,
      agora,
    );

    const serie = ultimosPeriodos(periodo, MESES_SERIE);
    const [liquidacoes, parcelas, saldoContas, pendentes, naoQuitadas] =
      await Promise.all([
        this.repo.liquidacoes(
          ctx,
          janelaDoMes(serie[0]).inicio,
          janelaDoMes(periodo).fimExclusivo,
        ),
        this.repo.parcelasReconhecidas(
          ctx,
          primeiroDiaCivil(serie[0]),
          primeiroDiaCivil(deslocarPeriodo(periodo, 1)),
        ),
        this.repo.saldoContas(ctx),
        this.repo.lancamentosAbertos(ctx, periodo),
        this.repo.faturasNaoQuitadas(ctx),
      ]);

    const porMes = new Map(
      serie.map((p) => [p, { receitas: 0n, despesas: 0n }]),
    );
    for (const l of liquidacoes) {
      const acumulado = porMes.get(periodoDoInstante(l.liquidadoEm));
      if (!acumulado) continue;
      if (l.lancamento.tipo === 'RECEITA')
        acumulado.receitas += l.valorCentavos;
      else acumulado.despesas += l.valorCentavos;
    }
    for (const p of parcelas) {
      const acumulado = porMes.get(periodoDaDataCivil(p.fatura.competencia));
      if (acumulado) acumulado.despesas += p.valorCentavos;
    }
    const receitasDespesas: SerieTemporalDto[] = serie.map((p) => ({
      periodo: p,
      receitasCentavos: String(porMes.get(p)?.receitas ?? 0n),
      despesasCentavos: String(porMes.get(p)?.despesas ?? 0n),
    }));
    const mes = porMes.get(periodo) ?? { receitas: 0n, despesas: 0n };

    const investido = ctx.posicoes.length
      ? somar(ctx.posicoes.map((p) => p.valorReferenciaCentavos))
      : null;
    const patrimonioBruto =
      saldoContas === null && investido === null
        ? null
        : (saldoContas ?? 0n) + (investido ?? 0n);
    const passivos = somar(naoQuitadas.map((f) => f.saldoDevedorCentavos));
    const patrimonioLiquido =
      patrimonioBruto === null ? null : patrimonioBruto - passivos;

    const limiteFaturas = ultimoDiaCivil(periodo);
    const faturasAteLimite = naoQuitadas.filter(
      (f) => f.dataVencimento <= limiteFaturas,
    );
    const projecaoDisponivel = periodo >= periodoAtual && saldoContas !== null;
    const saldoProjetado = projecaoDisponivel
      ? saldoProjetadoFinal(
          saldoContas,
          somar(
            pendentes
              .filter((p) => p.tipo === 'RECEITA')
              .map((p) => p.restanteCentavos),
          ),
          somar(
            pendentes
              .filter((p) => p.tipo === 'DESPESA')
              .map((p) => p.restanteCentavos),
          ) + somar(faturasAteLimite.map((f) => f.saldoDevedorCentavos)),
        )
      : null;

    const refPeriodo: ReferenciaDto = { tipo: 'periodo', valor: periodo };
    const refHoje: ReferenciaDto = {
      tipo: 'data',
      valor: chaveDataCivil(ctx.hojeCivil),
    };
    const indicador = (
      valor: bigint | null,
      referencia: ReferenciaDto,
      observacao: string | null = null,
    ): IndicadorFinanceiroDto => ({
      valorCentavos: toStr(valor),
      escopo: visao,
      referencia,
      parcial: observacao !== null && valor !== null,
      observacao,
    });

    const despesasDoMes: ItemCategorizado[] = [
      ...liquidacoes
        .filter(
          (l) =>
            l.lancamento.tipo === 'DESPESA' &&
            periodoDoInstante(l.liquidadoEm) === periodo,
        )
        .map((l) => ({
          valorCentavos: l.valorCentavos,
          categoriaUid: l.lancamento.categoriaUid,
          categoria: l.lancamento.categoria,
        })),
      ...parcelas
        .filter((p) => periodoDaDataCivil(p.fatura.competencia) === periodo)
        .map((p) => ({
          valorCentavos: p.valorCentavos,
          categoriaUid: p.compra.categoriaUid,
          categoria: p.compra.categoria,
        })),
    ];

    return {
      periodoReferencia: periodo,
      visao,
      atualizadoEm: agora.toISOString(),
      moeda: 'BRL',
      indisponivel: false,
      semDados:
        ctx.contas.length === 0 &&
        ctx.posicoes.length === 0 &&
        ctx.cartoes.length === 0 &&
        liquidacoes.length === 0 &&
        pendentes.length === 0,
      indicadores: {
        patrimonioLiquido: indicador(patrimonioLiquido, refHoje),
        saldoDisponivelContas: indicador(saldoContas, refHoje),
        receitasMes: indicador(mes.receitas, refPeriodo),
        despesasMes: indicador(mes.despesas, refPeriodo),
        saldoProjetadoMes: indicador(
          saldoProjetado,
          refPeriodo,
          periodo < periodoAtual ? OBS_PROJECAO_PASSADO : OBS_PROJECAO,
        ),
      },
      taxaPoupancaBp: taxaPoupancaBp(mes.receitas, mes.despesas),
      receitasDespesas,
      despesasPorCategoria: agruparPorCategoria(
        despesasDoMes,
        mes.despesas,
        usuarioUid,
      ).map((g) => ({
        ...g,
        valorCentavos: g.valorCentavos.toString(),
      })),
    };
  }
}
