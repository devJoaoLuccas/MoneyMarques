import { formatarPercentualBp } from '../../../shared/lib/format-percent'
import { Alert, EmptyState, MascaraValores } from '../../../shared/ui'
import { CartaoIndicador } from '../components/CartaoIndicador'
import { GraficoEvolucao } from '../components/GraficoEvolucao'
import { TelaPainel } from '../components/TelaPainel'
import { dataCivilDe, formatarDataCivil } from '../filtros/periodo'
import type { IndicadorFinanceiro, Participacao, Patrimonio } from '../types'
import styles from './Telas.module.css'

function Distribuicao({ titulo, itens }: { titulo: string; itens: Participacao[] }) {
  return (
    <section className={styles.secao} aria-label={titulo}>
      <h2 className={styles.tituloSecao}>{titulo}</h2>
      {itens.length === 0 ? (
        <EmptyState title="Sem investimentos registrados" />
      ) : (
        <ul className={styles.lista}>
          {itens.map((i) => (
            <li key={i.nome} className={styles.item}>
              <div className={styles.itemTexto}>
                <span>{i.nome}</span>
                <span className={styles.meta}>{formatarPercentualBp(i.participacaoBp)} dos investimentos</span>
              </div>
              <MascaraValores centavos={i.valorCentavos} className={styles.valor} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Conteudo({ dados }: { dados: Patrimonio }) {
  const referencia = { tipo: 'data' as const, valor: dataCivilDe(new Date(dados.atualizadoEm)) }
  const ind = (valorCentavos: string | null, observacao: string | null = null): IndicadorFinanceiro => ({
    valorCentavos,
    escopo: dados.visao,
    referencia,
    parcial: false,
    observacao,
  })

  if (dados.patrimonioBrutoCentavos === null) {
    return (
      <EmptyState title="Nenhum ativo nesta visão">
        Cadastre contas e investimentos para acompanhar seu patrimônio aqui.
      </EmptyState>
    )
  }

  return (
    <>
      <section aria-label="Patrimônio" className={styles.grade4}>
        <CartaoIndicador titulo="Patrimônio bruto" indicador={ind(dados.patrimonioBrutoCentavos)} />
        <CartaoIndicador titulo="Passivos (faturas em aberto)" indicador={ind(dados.passivosCentavos)} />
        <CartaoIndicador destaque titulo="Patrimônio líquido" indicador={ind(dados.patrimonioLiquidoCentavos)} />
        <CartaoIndicador titulo="Total investido" indicador={ind(dados.totalInvestidoCentavos)} />
      </section>

      {dados.ultimaAtualizacaoInvestimentos ? (
        <Alert variant="info">
          Investimentos são informados manualmente. Última atualização:{' '}
          {formatarDataCivil(dados.ultimaAtualizacaoInvestimentos)}. Não calculamos preço nem rentabilidade.
        </Alert>
      ) : (
        <Alert variant="info">Nenhum investimento registrado nesta visão.</Alert>
      )}

      <GraficoEvolucao
        titulo="Evolução dos ativos"
        legenda="Contas e investimentos ao fim de cada mês. Passivos não têm histórico e não entram."
        rotuloValor="Ativos"
        pontos={dados.evolucaoAtivos.map((p) => ({ periodo: p.periodo, valorCentavos: p.ativosCentavos }))}
      />

      <div className={styles.analise}>
        <Distribuicao titulo="Por instituição" itens={dados.porInstituicao} />
        <Distribuicao titulo="Por classe de ativo" itens={dados.porClasse} />
      </div>
    </>
  )
}

/** DASH-004: patrimonio e investimentos. Nunca inventa preco ou rentabilidade. */
export function PatrimonioPage() {
  return (
    <TelaPainel recurso="patrimonio" titulo="Patrimônio e investimentos" rotulo="o patrimônio">
      {(dados) => <Conteudo dados={dados} />}
    </TelaPainel>
  )
}
