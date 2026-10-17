import { useSession } from '../../auth'
import { useActiveFamily } from '../../family'
import { useFiltrosFinanceiros } from './useFiltrosFinanceiros'
import type { ContextoPainel } from './usePainel'

/** Contexto autorizado + filtros da tela; nulo enquanto a sessao ou a familia nao estao resolvidas. */
export function useContextoPainel() {
  const { data: sessao } = useSession()
  const familia = useActiveFamily()
  const filtros = useFiltrosFinanceiros()
  const contexto: ContextoPainel | null =
    sessao?.status === 'authenticated' && familia
      ? { familiaUid: familia.uid, usuarioUid: sessao.usuario.uid, visao: filtros.visao }
      : null
  return { contexto, ...filtros }
}
