import { FiAlertTriangle } from 'react-icons/fi'
import { useSearchParams } from 'react-router-dom'
import { cn } from '../../../shared/lib/cn'
import { Alert, EmptyState, MascaraValores } from '../../../shared/ui'
import { GraficoFluxoDiario, GraficoSaldoMensal } from '../components/ProjecaoGraficos'
import { TelaPainel } from '../components/TelaPainel'
import { rotuloPeriodo } from '../filtros/periodo'
import { HORIZONTES, horizonteDaUrl } from '../filtros/horizonte'
import type { ProjecaoMes, Projecoes } from '../types'
import styles from './Telas.module.css'

function CartaoProjecao({ mes }: { mes: ProjecaoMes }) {
  const negativo = mes.saldoFinalCentavos.startsWith('-')
  return (
    <li className={styles.item}>
      <div className={styles.itemTexto}>
        <strong>{rotuloPeriodo(mes.periodo)}</strong>
        <span className={styles.meta}>
          Inicial <MascaraValores centavos={mes.saldoInicialCentavos} /> · entradas previstas{' '}
          <MascaraValores centavos={mes.entradasPrevistasCentavos} /> · saídas previstas{' '}
          <MascaraValores centavos={mes.saidasPrevistasCentavos} />
        </span>
      </div>
      <div className={cn(styles.valor, negativo && styles.negativo)}>
        {negativo && (
          <span className={cn(styles.selo, styles.vencido)}>
            <FiAlertTriangle aria-hidden="true" />
            Saldo negativo
          </span>
        )}{' '}
        <MascaraValores centavos={mes.saldoFinalCentavos} />
      </div>
    </li>
  )
}

function Conteudo({ dados }: { dados: Projecoes }) {
  const [params, setParams] = useSearchParams()
  const horizonte = horizonteDaUrl(params.get('horizonte'))

  if (dados.saldoInicialCentavos === null) {
    return (
      <EmptyState title="Sem conta para projetar">
        A projeção parte do saldo das suas contas. Cadastre uma conta para ver os próximos meses.
      </EmptyState>
    )
  }

  const meses = dados.meses.slice(0, horizonte)
  return (
    <>
      <Alert variant="info">{dados.observacao}</Alert>

      <div role="group" aria-label="Horizonte da projeção" className={styles.segmentos}>
        {HORIZONTES.map(({ valor, rotulo }) => (
          <button
            key={valor}
            type="button"
            aria-pressed={horizonte === valor}
            className={cn(styles.segmento, horizonte === valor && styles.segmentoAtivo)}
            onClick={() =>
              setParams(
                (atuais) => {
                  const novos = new URLSearchParams(atuais)
                  novos.set('horizonte', String(valor))
                  return novos
                },
                { replace: true },
              )
            }
          >
            {rotulo}
          </button>
        ))}
      </div>

      {horizonte === 1 ? (
        <GraficoFluxoDiario dias={dados.fluxoDiarioMesAtual} menor={dados.menorSaldoMesAtual} />
      ) : (
        <div className={styles.analise}>
          <GraficoSaldoMensal meses={meses} />
          <GraficoFluxoDiario dias={dados.fluxoDiarioMesAtual} menor={dados.menorSaldoMesAtual} />
        </div>
      )}

      <section className={styles.secao} aria-labelledby="meses-projetados">
        <h2 id="meses-projetados" className={styles.tituloSecao}>
          Mês a mês
        </h2>
        <ul className={styles.lista}>
          {meses.map((m) => (
            <CartaoProjecao key={m.periodo} mes={m} />
          ))}
        </ul>
      </section>
    </>
  )
}

/** DASH-005: planejamento e projecao. Saldo final mensal e fluxo diario sao coisas distintas. */
export function ProjecoesPage() {
  return (
    <TelaPainel recurso="projecoes" titulo="Planejamento e projeção" rotulo="a projeção" semPeriodo>
      {(dados) => <Conteudo dados={dados} />}
    </TelaPainel>
  )
}
