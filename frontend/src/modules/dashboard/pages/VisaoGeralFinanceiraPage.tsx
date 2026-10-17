import { Link } from 'react-router-dom'
import { PaginaAutenticada } from '../../../shared/layouts/PaginaAutenticada/PaginaAutenticada'
import { formatarPercentualBp } from '../../../shared/lib/format-percent'
import { paths } from '../../../shared/routes/paths'
import { EmptyState } from '../../../shared/ui'
import { CartaoIndicador } from '../components/CartaoIndicador'
import { EstadoConsulta } from '../components/EstadoConsulta'
import { GraficoDespesasPorCategoria } from '../components/GraficoDespesasPorCategoria'
import { GraficoReceitasDespesas } from '../components/GraficoReceitasDespesas'
import { rotuloPeriodo } from '../filtros/periodo'
import { useContextoPainel } from '../hooks/useContextoPainel'
import { usePainelRecurso, type ContextoPainel } from '../hooks/usePainel'
import type { ResumoFinanceiro } from '../types'
import styles from './Telas.module.css'

const atalhos = [
  {
    to: paths.dashboardIncomeExpenses,
    titulo: 'Receitas e despesas',
    texto: 'Comparação com o mês anterior e maiores lançamentos.',
  },
  { to: paths.dashboardCards, titulo: 'Cartões e faturas', texto: 'Limite, fatura aberta e próximas faturas.' },
  { to: paths.dashboardNetWorth, titulo: 'Patrimônio e investimentos', texto: 'Ativos, passivos e evolução.' },
  { to: paths.dashboardProjections, titulo: 'Planejamento e projeção', texto: 'Saldo previsto dos próximos meses.' },
  {
    to: paths.dashboardDueDates,
    titulo: 'Vencimentos e alertas',
    texto: 'O que vence, o que venceu e o que merece atenção.',
  },
]

function AtalhosPainel() {
  return (
    <nav aria-label="Outras telas do painel" className={styles.atalhos}>
      {atalhos.map(({ to, titulo, texto }) => (
        <Link key={to} to={to} className={styles.atalho}>
          <strong>{titulo}</strong>
          <span>{texto}</span>
        </Link>
      ))}
    </nav>
  )
}

function ConteudoResumo({ resumo }: { resumo: ResumoFinanceiro }) {
  const { indicadores, taxaPoupancaBp } = resumo

  if (resumo.semDados) {
    return (
      <EmptyState title="Nenhum dado financeiro nesta visão">
        {resumo.visao === 'familiar'
          ? 'Ainda não há contas ou lançamentos compartilhados com você. Quando houver, os totais aparecem aqui.'
          : 'Cadastre sua primeira conta e seus lançamentos para acompanhar seus números aqui.'}
      </EmptyState>
    )
  }

  return (
    <>
      <section aria-label="Indicadores" className={styles.grade4}>
        <CartaoIndicador titulo="Patrimônio líquido" indicador={indicadores.patrimonioLiquido} />
        <CartaoIndicador titulo="Saldo disponível em contas" indicador={indicadores.saldoDisponivelContas} />
        <CartaoIndicador titulo="Receitas do mês" indicador={indicadores.receitasMes} />
        <CartaoIndicador titulo="Despesas do mês" indicador={indicadores.despesasMes} />
      </section>

      <CartaoIndicador destaque titulo="Saldo projetado do mês" indicador={indicadores.saldoProjetadoMes} />
      {taxaPoupancaBp !== null && (
        <p className={styles.nota}>
          Taxa de poupança em {rotuloPeriodo(resumo.periodoReferencia)}: {formatarPercentualBp(taxaPoupancaBp)}{' '}
          (receitas − despesas, sobre receitas realizadas).
        </p>
      )}

      <div className={styles.analise}>
        <GraficoReceitasDespesas serie={resumo.receitasDespesas} />
        <GraficoDespesasPorCategoria periodo={resumo.periodoReferencia} categorias={resumo.despesasPorCategoria} />
      </div>
      <AtalhosPainel />
    </>
  )
}

function Resumo({ contexto, periodo }: { contexto: ContextoPainel; periodo: string }) {
  const consulta = usePainelRecurso('resumo', contexto, periodo)
  return (
    <EstadoConsulta consulta={consulta} rotulo="o painel">
      {(resumo) => <ConteudoResumo resumo={resumo} />}
    </EstadoConsulta>
  )
}

/** DASH-001: Visao Geral Financeira. So consulta; o servidor consolida e autoriza antes de somar. */
export function VisaoGeralFinanceiraPage() {
  const { contexto, periodo, visao } = useContextoPainel()
  if (!contexto) return null
  return (
    <PaginaAutenticada
      title="Visão geral financeira"
      subtitle={`${visao === 'familiar' ? 'Finanças compartilhadas da família' : 'Suas finanças pessoais'} · ${rotuloPeriodo(periodo)}`}
    >
      <Resumo contexto={contexto} periodo={periodo} />
    </PaginaAutenticada>
  )
}
