import { useState } from 'react'
import { FiAlertCircle, FiAlertTriangle, FiInfo } from 'react-icons/fi'
import { cn } from '../../../shared/lib/cn'
import { Alert, EmptyState, MascaraValores, SelectField } from '../../../shared/ui'
import { EstadoConsulta } from '../components/EstadoConsulta'
import { SeloStatus } from '../components/SeloStatus'
import { TelaPainel } from '../components/TelaPainel'
import { formatarDataCivil, rotuloPeriodo } from '../filtros/periodo'
import { useContextoPainel } from '../hooks/useContextoPainel'
import { usePainelRecurso } from '../hooks/usePainel'
import type { Alerta, Compromisso, StatusCompromisso, Vencimentos } from '../types'
import styles from './Telas.module.css'

const GRAVIDADE = {
  CRITICO: { rotulo: 'Crítico', Icone: FiAlertCircle, classe: styles.vencido },
  ATENCAO: { rotulo: 'Atenção', Icone: FiAlertTriangle, classe: styles.pendente },
  INFORMATIVO: { rotulo: 'Informativo', Icone: FiInfo, classe: styles.previsto },
} as const

const TIPO = { RECEITA: 'Receita a receber', DESPESA: 'Despesa', FATURA: 'Fatura de cartão' } as const

function ListaAlertas({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) return <Alert variant="success">Nenhum alerta no momento.</Alert>
  return (
    <ul className={styles.lista} aria-label="Alertas">
      {alertas.map((a, indice) => {
        const { rotulo, Icone, classe } = GRAVIDADE[a.gravidade]
        return (
          <li key={`${a.tipo}-${indice}`} className={cn(styles.alerta, classe)}>
            <Icone aria-hidden="true" />
            <span className={styles.alertaTexto}>
              <strong>{rotulo}. </strong>
              {a.descricao}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function Alertas() {
  const { contexto, periodo } = useContextoPainel()
  if (!contexto) return null
  return <AlertasConsulta contexto={contexto} periodo={periodo} />
}

function AlertasConsulta({
  contexto,
  periodo,
}: {
  contexto: NonNullable<ReturnType<typeof useContextoPainel>['contexto']>
  periodo: string
}) {
  const consulta = usePainelRecurso('alertas', contexto, periodo)
  return (
    <section className={styles.secao} aria-labelledby="alertas-titulo">
      <h2 id="alertas-titulo" className={styles.tituloSecao}>
        Alertas
      </h2>
      <EstadoConsulta consulta={consulta} rotulo="os alertas">
        {(dados) => <ListaAlertas alertas={dados.alertas} />}
      </EstadoConsulta>
    </section>
  )
}

const FILTROS: { value: '' | StatusCompromisso; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'vencido', label: 'Vencidos' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'previsto', label: 'Previstos' },
  { value: 'pago', label: 'Pagos' },
]

function Item({ item }: { item: Compromisso }) {
  return (
    <li className={styles.item}>
      <div className={styles.itemTexto}>
        <span>{item.descricao}</span>
        <span className={styles.meta}>
          {TIPO[item.tipo]} · competência {rotuloPeriodo(item.competencia)} · vence em{' '}
          {formatarDataCivil(item.vencimento)}
        </span>
      </div>
      <SeloStatus status={item.status} />
      <MascaraValores
        centavos={item.valorCentavos}
        className={cn(styles.valor, item.tipo === 'RECEITA' && styles.positivo)}
      />
    </li>
  )
}

function Conteudo({ dados }: { dados: Vencimentos }) {
  const [filtro, setFiltro] = useState<'' | StatusCompromisso>('')
  const itens = filtro ? dados.itens.filter((i) => i.status === filtro) : dados.itens

  return (
    <>
      <Alertas />
      <section className={styles.secao} aria-labelledby="compromissos-titulo">
        <h2 id="compromissos-titulo" className={styles.tituloSecao}>
          Compromissos
        </h2>
        {dados.itens.length === 0 ? (
          <EmptyState title="Nenhum vencimento neste período">
            Vencidos de meses anteriores aparecem aqui até serem quitados.
          </EmptyState>
        ) : (
          <>
            <div className={styles.filtros}>
              <SelectField
                label="Situação"
                options={FILTROS}
                value={filtro}
                onChange={(e) => setFiltro(e.target.value as '' | StatusCompromisso)}
              />
            </div>
            {itens.length === 0 ? (
              <EmptyState title="Nenhum compromisso com essa situação" />
            ) : (
              <ul className={styles.lista}>
                {itens.map((i) => (
                  <Item key={`${i.origem}-${i.uid}`} item={i} />
                ))}
              </ul>
            )}
            {dados.truncado && (
              <Alert variant="warning">
                Mostrando só os primeiros compromissos. Escolha outro período para ver o resto.
              </Alert>
            )}
            <p className={styles.nota}>
              Para registrar um pagamento, use a operação de lançamentos ou de fatura; este painel só consulta e não
              altera saldos.
            </p>
          </>
        )}
      </section>
    </>
  )
}

/** DASH-006: vencimentos e alertas. "Marcar como pago" pertence a operacao transacional, nao ao painel. */
export function VencimentosPage() {
  return (
    <TelaPainel recurso="vencimentos" titulo="Vencimentos e alertas" rotulo="os vencimentos">
      {(dados) => <Conteudo dados={dados} />}
    </TelaPainel>
  )
}
