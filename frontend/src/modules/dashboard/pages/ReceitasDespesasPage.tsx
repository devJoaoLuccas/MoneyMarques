import { useSearchParams } from 'react-router-dom'
import { formatarVariacaoBp } from '../../../shared/lib/format-percent'
import { EmptyState, MascaraValores, SelectField } from '../../../shared/ui'
import { CartaoIndicador } from '../components/CartaoIndicador'
import { GraficoDespesasPorCategoria } from '../components/GraficoDespesasPorCategoria'
import { GraficoReceitasDespesas } from '../components/GraficoReceitasDespesas'
import { TelaPainel } from '../components/TelaPainel'
import { deslocarPeriodo, formatarDataCivil, rotuloPeriodo } from '../filtros/periodo'
import type { IndicadorFinanceiro, ReceitasDespesas, VisaoFinanceira } from '../types'
import styles from './Telas.module.css'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const indicador = (valor: string, visao: VisaoFinanceira, periodo: string): IndicadorFinanceiro => ({
  valorCentavos: valor,
  escopo: visao,
  referencia: { tipo: 'periodo', valor: periodo },
  parcial: false,
  observacao: null,
})

function Variacao({ bp, anterior, periodo }: { bp: number | null; anterior: string; periodo: string }) {
  if (bp === null) return <>Sem base de comparação em {rotuloPeriodo(deslocarPeriodo(periodo, -1))}.</>
  return (
    <>
      {formatarVariacaoBp(bp)} sobre {rotuloPeriodo(deslocarPeriodo(periodo, -1))} (
      <MascaraValores centavos={anterior} />)
    </>
  )
}

function Conteudo({ dados, visao, periodo }: { dados: ReceitasDespesas; visao: VisaoFinanceira; periodo: string }) {
  const [, setParams] = useSearchParams()
  const semMovimento =
    dados.serie.every((s) => s.receitasCentavos === '0' && s.despesasCentavos === '0') &&
    dados.previsto.receitasCentavos === '0' &&
    dados.previsto.despesasCentavos === '0'

  if (semMovimento && !dados.categoriaFiltrada) {
    return (
      <EmptyState title="Nenhuma movimentação neste período">
        Registre receitas e despesas para ver a análise aqui.
      </EmptyState>
    )
  }

  const categorias = dados.despesasPorCategoria.filter((c) => c.categoriaUid !== null)
  const opcoes = [
    { value: '', label: 'Todas as categorias' },
    ...categorias.map((c) => ({ value: c.categoriaUid as string, label: c.nome })),
  ]

  return (
    <>
      <div className={styles.filtros}>
        <SelectField
          label="Categoria"
          options={opcoes}
          value={dados.categoriaFiltrada ?? ''}
          onChange={(e) =>
            setParams(
              (atuais) => {
                const novos = new URLSearchParams(atuais)
                if (e.target.value) novos.set('categoria', e.target.value)
                else novos.delete('categoria')
                return novos
              },
              { replace: true },
            )
          }
        />
      </div>

      <section aria-label="Realizado no período" className={styles.grade3}>
        <CartaoIndicador
          titulo="Receitas realizadas"
          indicador={indicador(dados.atual.receitasCentavos, visao, periodo)}
          complemento={
            <Variacao bp={dados.variacaoReceitasBp} anterior={dados.anterior.receitasCentavos} periodo={periodo} />
          }
        />
        <CartaoIndicador
          titulo="Despesas realizadas"
          indicador={indicador(dados.atual.despesasCentavos, visao, periodo)}
          complemento={
            <Variacao bp={dados.variacaoDespesasBp} anterior={dados.anterior.despesasCentavos} periodo={periodo} />
          }
        />
        <CartaoIndicador
          titulo="Resultado do mês"
          indicador={indicador(dados.atual.resultadoCentavos, visao, periodo)}
        />
      </section>

      <p className={styles.nota}>
        <strong>Previsto, ainda não realizado:</strong> receitas{' '}
        <MascaraValores centavos={dados.previsto.receitasCentavos} /> e despesas{' '}
        <MascaraValores centavos={dados.previsto.despesasCentavos} /> com vencimento neste mês. Não entram nos totais
        acima.
      </p>

      <div className={styles.analise}>
        <GraficoReceitasDespesas serie={dados.serie} />
        <GraficoDespesasPorCategoria periodo={periodo} categorias={dados.despesasPorCategoria} />
      </div>
      <GraficoDespesasPorCategoria
        titulo="Receitas por categoria"
        periodo={periodo}
        categorias={dados.receitasPorCategoria}
      />

      <section className={styles.secao} aria-labelledby="maiores">
        <h2 id="maiores" className={styles.tituloSecao}>
          Maiores despesas do mês
        </h2>
        {dados.maioresLancamentos.length === 0 ? (
          <EmptyState title="Nenhuma despesa realizada neste período" />
        ) : (
          <ul className={styles.lista}>
            {dados.maioresLancamentos.map((l, indice) => (
              <li key={`${l.descricao}-${indice}`} className={styles.item}>
                <div className={styles.itemTexto}>
                  <span>{l.descricao}</span>
                  <span className={styles.meta}>
                    {formatarDataCivil(l.data)} · {l.categoria} ·{' '}
                    {l.origem === 'cartao' ? 'Cartão de crédito' : 'Conta'}
                  </span>
                </div>
                <MascaraValores centavos={l.valorCentavos} className={styles.valor} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

/** DASH-002: receitas e despesas. Realizado e previsto sempre separados e rotulados. */
export function ReceitasDespesasPage() {
  const [params] = useSearchParams()
  const categoria = params.get('categoria')
  return (
    <TelaPainel
      recurso="receitas-despesas"
      titulo="Receitas e despesas"
      rotulo="receitas e despesas"
      categoriaUid={categoria && UUID.test(categoria) ? categoria : undefined}
    >
      {(dados, { visao, periodo }) => <Conteudo dados={dados} visao={visao} periodo={periodo} />}
    </TelaPainel>
  )
}
