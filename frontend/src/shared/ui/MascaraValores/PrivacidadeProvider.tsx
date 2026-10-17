import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { PrivacidadeContext } from './privacidade-context'

const CHAVE = 'mm.privacidade.ocultarValores'

function lerPreferencia(): boolean {
  try {
    return window.localStorage.getItem(CHAVE) === '1'
  } catch {
    return false
  }
}

/** Preferencia de UI "ocultar valores" (sem dado financeiro; so um booleano no navegador). */
export function PrivacidadeProvider({ children }: { children: ReactNode }) {
  const [ocultar, setOcultar] = useState(lerPreferencia)

  const alternar = useCallback(() => {
    setOcultar((atual) => {
      try {
        window.localStorage.setItem(CHAVE, atual ? '0' : '1')
      } catch {
        // Sem storage: vale so ate recarregar.
      }
      return !atual
    })
  }, [])

  const valor = useMemo(() => ({ ocultar, alternar }), [ocultar, alternar])
  return <PrivacidadeContext value={valor}>{children}</PrivacidadeContext>
}
