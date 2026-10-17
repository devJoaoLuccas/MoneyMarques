import { createContext } from 'react'

export interface PrivacidadeValor {
  ocultar: boolean
  alternar: () => void
}

export const PrivacidadeContext = createContext<PrivacidadeValor>({
  ocultar: false,
  alternar: () => undefined,
})
