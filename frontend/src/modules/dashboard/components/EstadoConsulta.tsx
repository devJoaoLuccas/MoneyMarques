import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { FiRefreshCw } from 'react-icons/fi'
import { ApiError } from '../../../shared/lib/api-error'
import { Alert, Button, Skeleton } from '../../../shared/ui'
import styles from './EstadoConsulta.module.css'

interface EstadoConsultaProps<T> {
  consulta: UseQueryResult<T>
  /** Descreve o que carrega, para leitores de tela. */
  rotulo: string
  children: (dados: T) => ReactNode
}

/**
 * Estados obrigatorios de toda tela do painel: carregando (skeleton), erro de
 * rede (tentar novamente) e sem acesso (aviso neutro). Os demais (vazio,
 * parcial, sem movimentacao) pertencem a cada tela.
 */
export function EstadoConsulta<T>({ consulta, rotulo, children }: EstadoConsultaProps<T>) {
  if (consulta.isPending) {
    return (
      <div role="status" aria-label={`Carregando ${rotulo}`} className={styles.carregando}>
        <Skeleton className={styles.bloco} />
        <Skeleton className={styles.blocoGrande} />
      </div>
    )
  }

  if (consulta.isError) {
    const semAcesso = consulta.error instanceof ApiError && [403, 404].includes(consulta.error.status)
    if (semAcesso) return <Alert variant="warning">Você não tem acesso a estas informações.</Alert>
    return (
      <div className={styles.erro}>
        <Alert variant="error">Não foi possível carregar {rotulo}. Verifique sua conexão e tente novamente.</Alert>
        <Button variant="secondary" loading={consulta.isFetching} onClick={() => void consulta.refetch()}>
          <FiRefreshCw aria-hidden="true" />
          Tentar novamente
        </Button>
      </div>
    )
  }

  return <>{children(consulta.data)}</>
}
