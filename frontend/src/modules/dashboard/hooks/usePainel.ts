import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { painelService, type RecursoPainel, type RecursosPainel } from '../services/painel.service'
import type { VisaoFinanceira } from '../types'

/**
 * Chaves de cache SEMPRE com usuario, familia, visao e periodo (regra 10):
 * nenhum dado de um contexto e reaproveitado em outro. A familia vem primeiro
 * para descartar o contexto anterior de uma vez.
 */
export const painelKeys = {
  familia: (familiaUid: string) => ['painel', familiaUid] as const,
  visao: (familiaUid: string, usuarioUid: string, visao: VisaoFinanceira) =>
    ['painel', familiaUid, usuarioUid, visao] as const,
  recurso: (
    familiaUid: string,
    usuarioUid: string,
    visao: VisaoFinanceira,
    periodo: string,
    recurso: RecursoPainel,
    categoriaUid?: string,
  ) => ['painel', familiaUid, usuarioUid, visao, periodo, recurso, categoriaUid ?? null] as const,
}

export interface ContextoPainel {
  familiaUid: string
  usuarioUid: string
  visao: VisaoFinanceira
}

/** Consulta de qualquer tela do painel; o contexto autorizado nunca vem da URL. */
export function usePainelRecurso<R extends RecursoPainel>(
  recurso: R,
  contexto: ContextoPainel,
  periodo: string,
  categoriaUid?: string,
) {
  const { familiaUid, usuarioUid, visao } = contexto
  return useQuery<RecursosPainel[R]>({
    queryKey: painelKeys.recurso(familiaUid, usuarioUid, visao, periodo, recurso, categoriaUid),
    queryFn: () => painelService.obter(familiaUid, recurso, { visao, periodo, categoriaUid }),
    staleTime: 30_000,
    retry: false,
  })
}

/**
 * RN-DASH-002: trocar de familia ou de visao invalida o cache do contexto
 * anterior (remove os dados, nao so os marca como velhos).
 */
export function useIsolamentoCachePainel({ familiaUid, usuarioUid, visao }: ContextoPainel): void {
  const queryClient = useQueryClient()
  const anterior = useRef<ContextoPainel>({ familiaUid, usuarioUid, visao })

  useEffect(() => {
    const antes = anterior.current
    if (antes.familiaUid !== familiaUid) {
      queryClient.removeQueries({ queryKey: painelKeys.familia(antes.familiaUid) })
    } else if (antes.visao !== visao) {
      queryClient.removeQueries({ queryKey: painelKeys.visao(antes.familiaUid, antes.usuarioUid, antes.visao) })
    }
    anterior.current = { familiaUid, usuarioUid, visao }
  }, [queryClient, familiaUid, usuarioUid, visao])
}
