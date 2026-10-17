import type { RouteObject } from 'react-router-dom'
import { paths } from '../../shared/routes/paths'
import { FamilyInvitesPage } from './pages/FamilyInvitesPage'
import { FamilyMembersPage } from './pages/FamilyMembersPage'
import { FamilyOnboardingPage } from './pages/FamilyOnboardingPage'
import { FamilySentInvitesPage } from './pages/FamilySentInvitesPage'
import { InviteLinkPage } from './pages/InviteLinkPage'

/** Acessada pelo link do e-mail: funciona com ou sem sessao (a propria pagina decide o que mostrar). */
export const familyPublicRoutes: RouteObject[] = [{ path: paths.familyInviteLink, element: <InviteLinkPage /> }]

/** Rotas de Gestao Familiar alcancadas pela transicao AUTH-005 (o app as envolve em RequireAuth). */
export const familyRoutes: RouteObject[] = [
  { path: paths.familyOnboarding, element: <FamilyOnboardingPage /> },
  { path: paths.familyInvites, element: <FamilyInvitesPage /> },
]

/** Gestao da familia ativa (o app as envolve em RequireFamilyContext). */
export const familyManagementRoutes: RouteObject[] = [
  { path: paths.familyMembers, element: <FamilyMembersPage /> },
  { path: paths.familySentInvites, element: <FamilySentInvitesPage /> },
]
