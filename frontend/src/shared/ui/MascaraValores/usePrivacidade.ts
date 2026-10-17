import { useCallback, useContext } from 'react'
import { formatCentavos, MASCARA_VALOR } from '../../lib/format-money'
import { PrivacidadeContext, type PrivacidadeValor } from './privacidade-context'

export function usePrivacidade(): PrivacidadeValor {
  return useContext(PrivacidadeContext)
}

/**
 * Formatador unico de valores monetarios: todo texto com dinheiro (cards,
 * graficos, listas, tooltips e texto alternativo) passa por aqui, para que o
 * modo privacidade alcance tudo (regra 9).
 */
export function useFormatarMoeda(): (centavos: string | null | undefined) => string {
  const { ocultar } = usePrivacidade()
  return useCallback(
    (centavos) => {
      if (centavos === null || centavos === undefined) return '—'
      return ocultar ? MASCARA_VALOR : formatCentavos(centavos)
    },
    [ocultar],
  )
}
