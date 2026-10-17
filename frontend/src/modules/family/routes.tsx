import type { RouteObject } from 'react-router-dom'
import { paths } from '../../shared/routes/paths'
import { FamilyInvitesPage } from './pages/FamilyInvitesPage'
import { FamilyOnboardingPage } from './pages/FamilyOnboardingPage'

/** Rotas de Gestao Familiar alcancadas pela transicao AUTH-005 (o app as envolve em RequireAuth). */
export const familyRoutes: RouteObject[] = [
  { path: paths.familyOnboarding, element: <FamilyOnboardingPage /> },
  { path: paths.familyInvites, element: <FamilyInvitesPage /> },
]
