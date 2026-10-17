import { useId } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { EmptyState, useFormatarMoeda, usePrivacidade } from '../../../shared/ui'
import { rotuloPeriodo } from '../filtros/periodo'
import type { DistribuicaoCategoria } from '../types'
import styles from './Graficos.module.css'

interface GraficoDespesasPorCategoriaProps {
  /** Titulo da secao (padrao: despesas). */
  titulo?: string
  periodo: string
  categorias: DistribuicaoCategoria[]
}

const CORES = [
  'var(--color-secondary-neon)',
  'var(--color-accent)',
  'var(--color-primary)',
  'var(--color-warning)',
  'var(--color-info)',
  'var(--color-positive)',
  'var(--color-accent-violet)',
]
const cor = (indice: number) => CORES[indice % CORES.length]

const percentual = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** Distribuicao das despesas realizadas do mes por categoria (barras proporcionais + texto). */
export function GraficoDespesasPorCategoria({
  titulo = 'Despesas por categoria',
  periodo,
  categorias,
}: GraficoDespesasPorCategoriaProps) {
  const idTitulo = useId()
  const { ocultar } = usePrivacidade()
  const formatar = useFormatarMoeda()

  return (
    <section className={styles.painel} aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className={styles.titulo}>
        {titulo}
      </h2>
      <p className={styles.legendaPeriodo}>{rotuloPeriodo(periodo)}. Valores realizados.</p>

      {categorias.length === 0 ? (
        <EmptyState title="Nenhum valor realizado neste período" />
      ) : (
        <>
          {!ocultar && (
            <div className={styles.areaPizza} aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {/* Escala apenas visual; os valores exibidos vem das strings em centavos da API. */}
                  <Pie
                    data={categorias.map((c) => ({
                      nome: c.nome,
                      valor: Number(c.valorCentavos),
                      centavos: c.valorCentavos,
                    }))}
                    dataKey="valor"
                    nameKey="nome"
                    innerRadius="55%"
                    outerRadius="90%"
                    stroke="var(--color-surface)"
                  >
                    {categorias.map((c, indice) => (
                      <Cell key={c.categoriaUid ?? c.nome} fill={cor(indice)} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(_valor, nome, item) => [
                      formatar((item.payload as { centavos: string }).centavos),
                      nome,
                    ]}
                    contentStyle={{
                      background: 'var(--color-surface-secondary)',
                      border: '1px solid var(--color-border)',
                    }}
                    itemStyle={{ color: 'var(--color-text-primary)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <ul className={styles.categorias}>
            {categorias.map((categoria, indice) => (
              <li key={categoria.categoriaUid ?? categoria.nome} className={styles.categoria}>
                <div className={styles.categoriaTopo}>
                  <span className={styles.nomeCategoria}>
                    {!ocultar && (
                      <span className={styles.amostra} style={{ background: cor(indice) }} aria-hidden="true" />
                    )}
                    {categoria.nome}
                  </span>
                  <span className={styles.numero}>
                    {formatar(categoria.valorCentavos)} · {percentual.format(categoria.participacaoBp / 100)}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
