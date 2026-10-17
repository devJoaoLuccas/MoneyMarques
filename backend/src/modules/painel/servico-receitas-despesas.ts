import { Injectable } from '@nestjs/common';
import {
  agruparPorCategoria,
  ROTULO_OUTRAS,
  ROTULO_SEM_CATEGORIA,
  type ItemCategorizado,
} from './domain/categorias';
import { somar, variacaoPercentualBp } from './domain/indicadores';
import {
  chaveDataCivil,
  dataCivilLocal,
  deslocarPeriodo,
  janelaDoMes,
  periodoDaDataCivil,
  periodoDoInstante,
  primeiroDiaCivil,
  ultimosPeriodos,
} from './domain/periodo';
import type { ContextoFinanceiro } from './politica-acesso-financeiro';
import { RepositorioFinanceiro } from './repositorio-financeiro';
import { respostaBase, str } from './resposta';
import type {
  DistribuicaoCategoriaDto,
  LancamentoMaiorDto,
  ReceitasDespesasDto,
  TotaisPeriodoDto,
} from './painel.types';

const MESES_SERIE = 6;
const MAIORES = 10;

interface Fato extends ItemCategorizado {
  tipo: 'RECEITA' | 'DESPESA';
  periodo: string;
  descricao: string;
  data: string;
  origem: 'lancamento' | 'cartao';
}

const nomeCategoria = (item: ItemCategorizado, usuarioUid: string): string => {
  if (!item.categoria) return ROTULO_SEM_CATEGORIA;
  const privadaDeOutro =
    item.categoria.visibilidade === 'PRIVADO' &&
    item.categoria.titularUid !== usuarioUid;
  return privadaDeOutro ? ROTULO_OUTRAS : item.categoria.nome;
};

/**
 * DASH-002: receitas e despesas realizadas (liquidacoes confirmadas + parcelas
 * de cartao por competencia), comparacao com o mes anterior, distribuicao por
 * categoria e maiores lancamentos. O previsto vem separado e nunca e somado.
 */
@Injectable()
export class ServicoReceitasDespesas {
  constructor(private readonly repo: RepositorioFinanceiro) {}

  async obter(
    ctx: ContextoFinanceiro,
    periodo: string,
    categoriaUid?: string,
  ): Promise<ReceitasDespesasDto> {
    const serie = ultimosPeriodos(periodo, MESES_SERIE);
    const [liquidacoes, parcelas, abertos] = await Promise.all([
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
      this.repo.lancamentosAbertos(ctx, periodo),
    ]);

    const todos: Fato[] = [
      ...liquidacoes.map((l) => ({
        tipo: l.lancamento.tipo,
        periodo: periodoDoInstante(l.liquidadoEm),
        valorCentavos: l.valorCentavos,
        descricao: l.lancamento.descricao,
        data: chaveDataCivil(dataCivilLocal(l.liquidadoEm)),
        origem: 'lancamento' as const,
        categoriaUid: l.lancamento.categoriaUid,
        categoria: l.lancamento.categoria,
      })),
      ...parcelas.map((p) => ({
        tipo: 'DESPESA' as const,
        periodo: periodoDaDataCivil(p.fatura.competencia),
        valorCentavos: p.valorCentavos,
        descricao: p.compra.descricao,
        data: chaveDataCivil(p.compra.dataCompra),
        origem: 'cartao' as const,
        categoriaUid: p.compra.categoriaUid,
        categoria: p.compra.categoria,
      })),
    ];
    // A distribuicao ignora o filtro para o usuario poder trocar de categoria; o resto respeita.
    const filtrados = categoriaUid
      ? todos.filter((f) => f.categoriaUid === categoriaUid)
      : todos;

    const totais = (
      mes: string,
      fatos: Fato[],
    ): TotaisPeriodoDto & { r: bigint; d: bigint } => {
      const r = somar(
        fatos
          .filter((f) => f.periodo === mes && f.tipo === 'RECEITA')
          .map((f) => f.valorCentavos),
      );
      const d = somar(
        fatos
          .filter((f) => f.periodo === mes && f.tipo === 'DESPESA')
          .map((f) => f.valorCentavos),
      );
      return {
        receitasCentavos: str(r),
        despesasCentavos: str(d),
        resultadoCentavos: str(r - d),
        r,
        d,
      };
    };
    const atual = totais(periodo, filtrados);
    const anterior = totais(deslocarPeriodo(periodo, -1), filtrados);

    const distribuicao = (
      tipo: 'RECEITA' | 'DESPESA',
    ): DistribuicaoCategoriaDto[] => {
      const doMes = todos.filter(
        (f) => f.periodo === periodo && f.tipo === tipo,
      );
      return agruparPorCategoria(
        doMes,
        somar(doMes.map((f) => f.valorCentavos)),
        ctx.usuarioUid,
      ).map((g) => ({
        ...g,
        valorCentavos: str(g.valorCentavos),
      }));
    };

    const maiores: LancamentoMaiorDto[] = filtrados
      .filter((f) => f.periodo === periodo && f.tipo === 'DESPESA')
      .sort((a, b) =>
        a.valorCentavos === b.valorCentavos
          ? 0
          : a.valorCentavos > b.valorCentavos
            ? -1
            : 1,
      )
      .slice(0, MAIORES)
      .map((f) => ({
        descricao: f.descricao,
        valorCentavos: str(f.valorCentavos),
        data: f.data,
        origem: f.origem,
        categoria: nomeCategoria(f, ctx.usuarioUid),
      }));

    const doMesPrevisto = abertos.filter(
      (a) =>
        periodoDaDataCivil(a.vencimento) === periodo &&
        (!categoriaUid || a.categoriaUid === categoriaUid),
    );
    const previsto = (tipo: 'RECEITA' | 'DESPESA') =>
      str(
        somar(
          doMesPrevisto
            .filter((a) => a.tipo === tipo)
            .map((a) => a.restanteCentavos),
        ),
      );

    return {
      ...respostaBase(ctx, periodo),
      atual: {
        receitasCentavos: atual.receitasCentavos,
        despesasCentavos: atual.despesasCentavos,
        resultadoCentavos: atual.resultadoCentavos,
      },
      anterior: {
        receitasCentavos: anterior.receitasCentavos,
        despesasCentavos: anterior.despesasCentavos,
        resultadoCentavos: anterior.resultadoCentavos,
      },
      variacaoReceitasBp: variacaoPercentualBp(atual.r, anterior.r),
      variacaoDespesasBp: variacaoPercentualBp(atual.d, anterior.d),
      previsto: {
        receitasCentavos: previsto('RECEITA'),
        despesasCentavos: previsto('DESPESA'),
      },
      serie: serie.map((p) => {
        const t = totais(p, filtrados);
        return {
          periodo: p,
          receitasCentavos: t.receitasCentavos,
          despesasCentavos: t.despesasCentavos,
        };
      }),
      despesasPorCategoria: distribuicao('DESPESA'),
      receitasPorCategoria: distribuicao('RECEITA'),
      maioresLancamentos: maiores,
      categoriaFiltrada: categoriaUid ?? null,
    };
  }
}
