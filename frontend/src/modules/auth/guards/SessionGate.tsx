import type { ReactNode } from 'react'
import { Alert, Button, LoadingIndicator } from '../../../shared/ui'
import { useSession } from '../hooks/useSession'
import type { SessionView } from '../types'
import styles from './SessionGate.module.css'

interface SessionGateProps {
  children: (session: SessionView) => ReactNode
}

/**
 * Resolve o estado da sessao no servidor antes de decidir o que renderizar:
 * carregamento e falha de consulta tem feedback proprio e NUNCA liberam conteudo
 * privado por padrao (negar por padrao, RN-AUTH-008).
 */
export function SessionGate({ children }: SessionGateProps) {
  const { data: session, isPending, isError, refetch, isFetching } = useSession()

  if (isPending) {
    return (
      <div className={styles.center}>
        <LoadingIndicator label="Verificando sessão" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className={styles.center}>
        <div className={styles.error}>
          <Alert variant="error">Não foi possível verificar sua sessão. Verifique sua conexão e tente novamente.</Alert>
          <Button variant="secondary" loading={isFetching} onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  return <>{children(session)}</>
}
