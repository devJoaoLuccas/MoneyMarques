import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  type TooltipContentProps,
} from 'recharts'
import { useFormatarMoeda, usePrivacidade } from '../../../shared/ui'
import { rotuloPeriodo, rotuloPeriodoCurto } from '../filtros/periodo'
import type { SerieTemporal } from '../types'
import styles from './Graficos.module.css'

interface GraficoReceitasDespesasProps {
  serie: SerieTemporal[]
}

/**
 * So para escalar as barras: o valor exibido (tooltip, tabela) vem sempre da
 * string em centavos devolvida pela API; nenhuma soma e feita aqui.
 */
const paraEscala = (centavos: string) => Number(centavos)

interface LinhaGrafico {
  periodo: string
  mes: string
  receitas: number
  despesas: number
  receitasCentavos: string
  despesasCentavos: string
}

function TooltipSerie({ active, payload }: TooltipContentProps) {
  const formatar = useFormatarMoeda()
  const linha = payload?.[0]?.payload as LinhaGrafico | undefined
  if (!active || !linha) return null
  return (
    <div className={styles.tooltip}>
      <strong>{rotuloPeriodo(linha.periodo)}</strong>
      <span>Receitas realizadas: {formatar(linha.receitasCentavos)}</span>
      <span>Despesas realizadas: {formatar(linha.despesasCentavos)}</span>
    </div>
  )
}

/** Receitas × Despesas dos ultimos 6 meses. Apenas realizado (nunca previsto). */
export function GraficoReceitasDespesas({ serie }: GraficoReceitasDespesasProps) {
  const { ocultar } = usePrivacidade()
  const formatar = useFormatarMoeda()
  const dados: LinhaGrafico[] = serie.map((item) => ({
    periodo: item.periodo,
    mes: rotuloPeriodoCurto(item.periodo),
    receitas: paraEscala(item.receitasCentavos),
    despesas: paraEscala(item.despesasCentavos),
    receitasCentavos: item.receitasCentavos,
    despesasCentavos: item.despesasCentavos,
  }))
  const primeiro = serie[0]?.periodo
  const ultimo = serie.at(-1)?.periodo

  return (
    <section className={styles.painel} aria-labelledby="grafico-receitas-despesas">
      <h2 id="grafico-receitas-despesas" className={styles.titulo}>
        Receitas × Despesas
      </h2>
      <p className={styles.legendaPeriodo}>
        {primeiro && ultimo && `${rotuloPeriodo(primeiro)} a ${rotuloPeriodo(ultimo)}. Valores realizados.`}
      </p>

      {ocultar ? (
        <p className={styles.oculto}>Valores ocultos.</p>
      ) : (
        <div className={styles.area} aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="mes" stroke="var(--color-text-secondary)" tickLine={false} />
              <Tooltip content={TooltipSerie} cursor={{ fill: 'var(--color-surface-secondary)' }} />
              <Legend />
              <Bar dataKey="receitas" name="Receitas" fill="var(--color-positive)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="var(--color-negative)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <details className={styles.detalhes}>
        <summary>Ver os dados em tabela</summary>
        <table className={styles.tabela}>
          <caption className="visually-hidden">Receitas e despesas realizadas por mês</caption>
          <thead>
            <tr>
              <th scope="col">Mês</th>
              <th scope="col">Receitas</th>
              <th scope="col">Despesas</th>
            </tr>
          </thead>
          <tbody>
            {serie.map((item) => (
              <tr key={item.periodo}>
                <th scope="row">{rotuloPeriodo(item.periodo)}</th>
                <td className={styles.numero}>{formatar(item.receitasCentavos)}</td>
                <td className={styles.numero}>{formatar(item.despesasCentavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}
