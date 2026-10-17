import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { deslocarPeriodo, periodoAtual, periodoValido } from '../filtros/periodo'
import type { VisaoFinanceira } from '../types'

/**
 * Filtros globais (visao e periodo) sincronizados com a URL. Valor invalido na
 * URL cai no padrao: a URL nunca e confiada nem carrega dado sigiloso.
 */
export function useFiltrosFinanceiros() {
  const [params, setParams] = useSearchParams()

  const visao: VisaoFinanceira = params.get('visao') === 'familiar' ? 'familiar' : 'pessoal'
  const periodoParam = params.get('periodo')
  const periodo = periodoValido(periodoParam) ? periodoParam : periodoAtual()

  const atualizar = useCallback(
    (alteracoes: Record<string, string>) => {
      setParams(
        (atuais) => {
          const proximos = new URLSearchParams(atuais)
          for (const [chave, valor] of Object.entries(alteracoes)) proximos.set(chave, valor)
          return proximos
        },
        { replace: true },
      )
    },
    [setParams],
  )

  return {
    visao,
    periodo,
    definirVisao: (nova: VisaoFinanceira) => atualizar({ visao: nova }),
    mesAnterior: () => atualizar({ periodo: deslocarPeriodo(periodo, -1) }),
    proximoMes: () => atualizar({ periodo: deslocarPeriodo(periodo, 1) }),
  }
}
