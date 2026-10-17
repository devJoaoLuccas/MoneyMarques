import type { RouteObject } from 'react-router-dom'
import { LegalPlaceholderPage } from './pages/LegalPlaceholderPage'

export const legalRoutes: RouteObject[] = [
  { path: '/termos', element: <LegalPlaceholderPage title="Termos de Uso" /> },
  { path: '/privacidade', element: <LegalPlaceholderPage title="Política de Privacidade" /> },
]
