import { FiEye, FiEyeOff } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { paths } from '../../../shared/routes/paths'
import { usePrivacidade } from '../../../shared/ui'
import { useSession } from '../../auth'
import { useActiveFamily } from '../../family'
import { useFiltrosFinanceiros } from '../hooks/useFiltrosFinanceiros'
import { SeletorPeriodo } from './SeletorPeriodo'
import { SeletorVisaoFinanceira } from './SeletorVisaoFinanceira'
import styles from './CabecalhoFinanceiro.module.css'

interface CabecalhoFinanceiroProps {
  /** Visao e periodo so fazem sentido nas telas do painel; nas demais o cabecalho mostra familia e privacidade. */
  comFiltros: boolean
}

/** Cabecalho global: familia ativa, visao pessoal/familiar, periodo e ocultar valores (RN-DASH-002). */
export function CabecalhoFinanceiro({ comFiltros }: CabecalhoFinanceiroProps) {
  const familia = useActiveFamily()
  const { data: sessao } = useSession()
  const { visao, periodo, definirVisao, mesAnterior, proximoMes } = useFiltrosFinanceiros()
  const { ocultar, alternar } = usePrivacidade()
  const podeTrocarFamilia = sessao?.status === 'authenticated' && sessao.contexto.familias.length > 1

  return (
    <header className={styles.cabecalho}>
      <div className={styles.familia}>
        <span className={styles.rotuloFamilia}>Família ativa</span>
        <strong className={styles.nomeFamilia}>{familia?.nome ?? '—'}</strong>
        {podeTrocarFamilia && <Link to={paths.context}>Trocar família</Link>}
      </div>

      {comFiltros && (
        <div className={styles.filtros}>
          <SeletorVisaoFinanceira visao={visao} onChange={definirVisao} />
          <SeletorPeriodo periodo={periodo} onAnterior={mesAnterior} onProximo={proximoMes} />
        </div>
      )}

      <button type="button" className={styles.privacidade} aria-pressed={ocultar} onClick={alternar}>
        {ocultar ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
        {ocultar ? 'Mostrar valores' : 'Ocultar valores'}
      </button>
    </header>
  )
}
