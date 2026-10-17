import { useLocation } from 'react-router-dom'

/** Expoe a rota atual para os testes verificarem navegacao e redirecionamentos. */
export function LocationProbe() {
  const { pathname, search, hash } = useLocation()
  return <div data-testid="location">{`${pathname}${search}${hash}`}</div>
}
