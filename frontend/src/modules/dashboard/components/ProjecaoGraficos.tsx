import { useId } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  type TooltipContentProps,
} from 'recharts'
import { useFormatarMoeda, usePrivacidade } from '../../../shared/ui'
import { formatarDataCivil, rotuloPeriodo, rotuloPeriodoCurto } from '../filtros/periodo'
import type { DiaFluxo, ProjecaoMes } from '../types'
import styles from './Graficos.module.css'

/** Escala visual apenas; textos e tabelas usam as strings em centavos. */
const escala = (centavos: string) => Number(centavos)

interface LinhaMes {
  periodo: string
  mes: string
  saldo: number
  saldoCentavos: string
}

function TooltipMes({ active, payload }: TooltipContentProps) {
  const formatar = useFormatarMoeda()
  const linha = payload?.[0]?.payload as LinhaMes | undefined
  if (!active || !linha) return null
  return (
    <div className={styles.tooltip}>
      <strong>{rotuloPeriodo(linha.periodo)}</strong>
      <span>Saldo final previsto: {formatar(linha.saldoCentavos)}</span>
    </div>
  )
}

/** Saldo final PREVISTO por mes. Negativos usam outra cor, mas tambem aparecem rotulados na lista e na tabela. */
export function GraficoSaldoMensal({ meses }: { meses: ProjecaoMes[] }) {
  const idTitulo = useId()
  const { ocultar } = usePrivacidade()
  const formatar = useFormatarMoeda()
  const linhas: LinhaMes[] = meses.map((m) => ({
    periodo: m.periodo,
    mes: rotuloPeriodoCurto(m.periodo),
    saldo: escala(m.saldoFinalCentavos),
    saldoCentavos: m.saldoFinalCentavos,
  }))

  return (
    <section className={styles.painel} aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className={styles.titulo}>
        Saldo final previsto por mês
      </h2>
      <p className={styles.legendaPeriodo}>Previsto, não realizado. Barras em rosa indicam saldo negativo.</p>
      {ocultar ? (
        <p className={styles.oculto}>Valores ocultos.</p>
      ) : (
        <div className={styles.area} aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={linhas} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="mes" stroke="var(--color-text-secondary)" tickLine={false} />
              <ReferenceLine y={0} stroke="var(--color-border)" />
              <Tooltip content={TooltipMes} cursor={{ fill: 'var(--color-surface-secondary)' }} />
              <Bar dataKey="saldo" radius={[4, 4, 0, 0]}>
                {linhas.map((l) => (
                  <Cell key={l.periodo} fill={l.saldo < 0 ? 'var(--color-negative)' : 'var(--color-secondary-neon)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <details className={styles.detalhes}>
        <summary>Ver os dados em tabela</summary>
        <table className={styles.tabela}>
          <caption className="visually-hidden">Saldo final previsto por mês</caption>
          <thead>
            <tr>
              <th scope="col">Mês</th>
              <th scope="col">Saldo final previsto</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => (
              <tr key={m.periodo}>
                <th scope="row">{rotuloPeriodo(m.periodo)}</th>
                <td className={styles.numero}>{formatar(m.saldoFinalCentavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}

interface LinhaDia {
  data: string
  dia: string
  saldo: number
  saldoCentavos: string
}

function TooltipDia({ active, payload }: TooltipContentProps) {
  const formatar = useFormatarMoeda()
  const linha = payload?.[0]?.payload as LinhaDia | undefined
  if (!active || !linha) return null
  return (
    <div className={styles.tooltip}>
      <strong>{formatarDataCivil(linha.data)}</strong>
      <span>Saldo previsto: {formatar(linha.saldoCentavos)}</span>
    </div>
  )
}

/** Fluxo de caixa DIARIO do mes atual: mostra o menor saldo no meio do mes, que o saldo final mensal esconde. */
export function GraficoFluxoDiario({ dias, menor }: { dias: DiaFluxo[]; menor: DiaFluxo | null }) {
  const idTitulo = useId()
  const { ocultar } = usePrivacidade()
  const formatar = useFormatarMoeda()
  const linhas: LinhaDia[] = dias.map((d) => ({
    data: d.data,
    dia: d.data.slice(8),
    saldo: escala(d.saldoCentavos),
    saldoCentavos: d.saldoCentavos,
  }))
  const menorNegativo = menor !== null && menor.saldoCentavos.startsWith('-')

  return (
    <section className={styles.painel} aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className={styles.titulo}>
        Fluxo de caixa diário do mês atual
      </h2>
      <p className={styles.legendaPeriodo}>
        Do dia de hoje ao fim do mês, partindo do saldo atual. Atrasados contam em hoje.
      </p>
      {menor && (
        <p role={menorNegativo ? 'alert' : undefined}>
          Menor saldo previsto: {formatar(menor.saldoCentavos)} em {formatarDataCivil(menor.data)}
          {menorNegativo && ' — saldo negativo'}.
        </p>
      )}
      {ocultar ? (
        <p className={styles.oculto}>Valores ocultos.</p>
      ) : (
        <div className={styles.area} aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={linhas} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="dia" stroke="var(--color-text-secondary)" tickLine={false} />
              <ReferenceLine y={0} stroke="var(--color-negative)" strokeDasharray="4 4" />
              <Tooltip content={TooltipDia} />
              <Line type="stepAfter" dataKey="saldo" stroke="var(--color-secondary-neon)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
