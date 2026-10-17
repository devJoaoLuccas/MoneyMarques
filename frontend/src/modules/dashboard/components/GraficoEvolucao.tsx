import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, type TooltipContentProps } from 'recharts'
import { EmptyState, useFormatarMoeda, usePrivacidade } from '../../../shared/ui'
import { rotuloPeriodo, rotuloPeriodoCurto } from '../filtros/periodo'
import styles from './Graficos.module.css'

export interface PontoEvolucao {
  periodo: string
  /** Centavos como string; `null` = sem dado naquele mes (nao e zero). */
  valorCentavos: string | null
}

interface GraficoEvolucaoProps {
  titulo: string
  legenda: string
  pontos: PontoEvolucao[]
  /** Cabecalho da coluna de valores na tabela de apoio. */
  rotuloValor: string
}

interface Linha {
  periodo: string
  mes: string
  valor: number | null
  valorCentavos: string | null
}

function TooltipEvolucao({ active, payload }: TooltipContentProps) {
  const formatar = useFormatarMoeda()
  const linha = payload?.[0]?.payload as Linha | undefined
  if (!active || !linha) return null
  return (
    <div className={styles.tooltip}>
      <strong>{rotuloPeriodo(linha.periodo)}</strong>
      <span>{formatar(linha.valorCentavos)}</span>
    </div>
  )
}

/** Evolucao mensal de um valor (area). Meses sem dado ficam como lacuna; a tabela de apoio traz os valores exatos. */
export function GraficoEvolucao({ titulo, legenda, pontos, rotuloValor }: GraficoEvolucaoProps) {
  const idTitulo = useId()
  const { ocultar } = usePrivacidade()
  const formatar = useFormatarMoeda()
  const comDados = pontos.some((p) => p.valorCentavos !== null)
  // Escala visual apenas; o texto exibido vem das strings em centavos.
  const linhas: Linha[] = pontos.map((p) => ({
    periodo: p.periodo,
    mes: rotuloPeriodoCurto(p.periodo),
    valor: p.valorCentavos === null ? null : Number(p.valorCentavos),
    valorCentavos: p.valorCentavos,
  }))

  return (
    <section className={styles.painel} aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className={styles.titulo}>
        {titulo}
      </h2>
      <p className={styles.legendaPeriodo}>{legenda}</p>

      {!comDados ? (
        <EmptyState title="Sem histórico para exibir" />
      ) : ocultar ? (
        <p className={styles.oculto}>Valores ocultos.</p>
      ) : (
        <div className={styles.area} aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={linhas} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="mes" stroke="var(--color-text-secondary)" tickLine={false} />
              <Tooltip content={TooltipEvolucao} />
              <Area
                type="monotone"
                dataKey="valor"
                stroke="var(--color-secondary-neon)"
                fill="var(--color-secondary-neon)"
                fillOpacity={0.15}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {comDados && (
        <details className={styles.detalhes}>
          <summary>Ver os dados em tabela</summary>
          <table className={styles.tabela}>
            <caption className="visually-hidden">{titulo}</caption>
            <thead>
              <tr>
                <th scope="col">Mês</th>
                <th scope="col">{rotuloValor}</th>
              </tr>
            </thead>
            <tbody>
              {pontos.map((p) => (
                <tr key={p.periodo}>
                  <th scope="row">{rotuloPeriodo(p.periodo)}</th>
                  <td className={styles.numero}>{formatar(p.valorCentavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  )
}
