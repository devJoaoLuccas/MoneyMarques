import { cn } from '../../../shared/lib/cn'
import { EmptyState, MascaraValores, usePrivacidade } from '../../../shared/ui'
import { CartaoIndicador } from '../components/CartaoIndicador'
import { SeloStatus } from '../components/SeloStatus'
import { TelaPainel } from '../components/TelaPainel'
import { dataCivilDe, formatarDataCivil, rotuloPeriodo } from '../filtros/periodo'
import type { CartaoPainel, CartoesPainel, FaturaResumo } from '../types'
import styles from './Telas.module.css'

function Fatura({ fatura, titulo }: { fatura: FaturaResumo; titulo: string }) {
  return (
    <li className={styles.item}>
      <div className={styles.itemTexto}>
        <span>
          {titulo} · {rotuloPeriodo(fatura.competencia)}
        </span>
        <span className={styles.meta}>
          Fecha em {formatarDataCivil(fatura.dataFechamento)} · vence em {formatarDataCivil(fatura.dataVencimento)}
        </span>
      </div>
      <SeloStatus status={fatura.status} />
      <MascaraValores centavos={fatura.saldoDevedorCentavos} className={styles.valor} />
    </li>
  )
}

function Cartao({ cartao }: { cartao: CartaoPainel }) {
  const { ocultar } = usePrivacidade()
  const limite = BigInt(cartao.limiteCentavos)
  // Apenas para a largura da barra; os valores exibidos vem das strings em centavos.
  const uso = limite > 0n ? Math.min(100, Number((BigInt(cartao.utilizadoCentavos) * 100n) / limite)) : 0

  return (
    <article className={styles.secao} aria-label={cartao.nome}>
      <header>
        <h2 className={styles.tituloSecao}>{cartao.nome}</h2>
        <p className={styles.meta}>
          {[cartao.bandeira, cartao.emissor].filter(Boolean).join(' · ')}
          {cartao.identificadorMascarado && ` · final ${cartao.identificadorMascarado}`}
          {cartao.situacao === 'BLOQUEADO' && ' · Bloqueado'}
        </p>
      </header>

      <dl className={styles.fatos}>
        <div>
          <dt>Limite total</dt>
          <dd>
            <MascaraValores centavos={cartao.limiteCentavos} />
          </dd>
        </div>
        <div>
          <dt>Limite comprometido</dt>
          <dd>
            <MascaraValores centavos={cartao.utilizadoCentavos} />
          </dd>
        </div>
        <div>
          <dt>Limite disponível</dt>
          <dd>
            <MascaraValores centavos={cartao.disponivelCentavos} />
          </dd>
        </div>
        <div>
          <dt>Fechamento / vencimento</dt>
          <dd>
            dia {cartao.diaFechamento} / dia {cartao.diaVencimento}
          </dd>
        </div>
      </dl>
      {!ocultar && (
        <div className={styles.barraLimite} aria-hidden="true">
          <div
            className={cn(styles.preenchimento, uso >= 80 && styles.preenchimentoAlto)}
            style={{ width: `${uso}%` }}
          />
        </div>
      )}
      <p className={styles.meta}>Limite de crédito não é saldo disponível em conta.</p>

      <ul className={styles.lista}>
        {cartao.faturaAberta ? (
          <Fatura fatura={cartao.faturaAberta} titulo="Fatura aberta" />
        ) : (
          <li className={styles.meta}>Nenhuma fatura aberta.</li>
        )}
        {cartao.proximasFaturas.map((f) => (
          <Fatura key={f.uid} fatura={f} titulo="Próxima fatura" />
        ))}
      </ul>
    </article>
  )
}

function Conteudo({ dados }: { dados: CartoesPainel }) {
  if (dados.cartoes.length === 0) {
    return (
      <EmptyState title="Nenhum cartão nesta visão">
        {dados.visao === 'familiar'
          ? 'Ainda não há cartões compartilhados com você.'
          : 'Cadastre um cartão de crédito para acompanhar limite e faturas aqui.'}
      </EmptyState>
    )
  }
  const referencia = { tipo: 'data' as const, valor: dataCivilDe(new Date(dados.atualizadoEm)) }
  const base = { escopo: dados.visao, referencia, parcial: false, observacao: null }
  return (
    <>
      <section aria-label="Totais dos cartões" className={styles.grade3}>
        <CartaoIndicador titulo="Limite total" indicador={{ ...base, valorCentavos: dados.totais.limiteCentavos }} />
        <CartaoIndicador
          titulo="Limite comprometido"
          indicador={{ ...base, valorCentavos: dados.totais.utilizadoCentavos }}
        />
        <CartaoIndicador
          titulo="Limite disponível"
          indicador={{ ...base, valorCentavos: dados.totais.disponivelCentavos }}
        />
      </section>
      {dados.cartoes.map((c) => (
        <Cartao key={c.uid} cartao={c} />
      ))}
    </>
  )
}

/** DASH-003: cartoes autorizados, limite e faturas. O pagamento da fatura nao e despesa nova. */
export function CartoesPage() {
  return (
    <TelaPainel recurso="cartoes" titulo="Cartões e faturas" rotulo="os cartões" semPeriodo>
      {(dados) => <Conteudo dados={dados} />}
    </TelaPainel>
  )
}
