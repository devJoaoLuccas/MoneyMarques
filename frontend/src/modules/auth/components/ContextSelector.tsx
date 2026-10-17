import { Navigate, useNavigate } from 'react-router-dom'
import { paths } from '../../../shared/routes/paths'
import { Button, LoadingIndicator } from '../../../shared/ui'
import { useSession } from '../hooks/useSession'
import { resolveDestination } from '../navigation/resolve-destination'
import { getSelectedFamily, setSelectedFamily } from '../state/selected-family'
import styles from './ContextSelector.module.css'

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  INTEGRANTE: 'Integrante',
  VISUALIZADOR: 'Visualizador',
}

/**
 * AUTH-005: escolha entre varias familias. A selecao apenas orienta a
 * navegacao; o servidor valida associacao e papel a cada requisicao (RN-AUTH-012).
 */
export function ContextSelector() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()

  if (isPending) return <LoadingIndicator label="Carregando suas famílias" />
  if (!session || session.status !== 'authenticated' || session.contexto.tipo !== 'multiplo') {
    return <Navigate to={resolveDestination(session ?? { status: 'auth_required' }, getSelectedFamily())} replace />
  }

  return (
    <ul className={styles.list}>
      {session.contexto.familias.map((familia) => (
        <li key={familia.uid}>
          <Button
            variant="secondary"
            fullWidth
            className={styles.option}
            onClick={() => {
              setSelectedFamily(familia.uid)
              navigate(paths.app, { replace: true })
            }}
          >
            <span className={styles.name}>{familia.nome}</span>
            <span className={styles.role}>{ROLE_LABELS[familia.papel] ?? familia.papel}</span>
          </Button>
        </li>
      ))}
    </ul>
  )
}
