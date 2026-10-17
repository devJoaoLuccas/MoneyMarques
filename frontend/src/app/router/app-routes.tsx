import type { RouteObject } from 'react-router-dom'
import {
  authGuestRoutes,
  authMfaRoutes,
  authPrivateRoutes,
  authPublicRoutes,
  GuestOnly,
  RequireAuth,
  RequireFamilyContext,
  RequireSessionStatus,
} from '../../modules/auth'
import { dashboardRoutes } from '../../modules/dashboard'
import { familyManagementRoutes, familyPublicRoutes, familyRoutes } from '../../modules/family'
import { legalRoutes } from '../../modules/legal/routes'
import { LayoutAutenticado } from '../layouts/LayoutAutenticado'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RootRedirect } from '../pages/RootRedirect'

/**
 * Composicao das rotas: cada modulo expoe as suas; o app decide qual guarda
 * envolve cada grupo (publica, visitante, MFA pendente, autenticada, com familia).
 */
export const appRoutes: RouteObject[] = [
  { path: '/', element: <RootRedirect /> },
  { element: <GuestOnly />, children: authGuestRoutes },
  ...authPublicRoutes,
  ...legalRoutes,
  ...familyPublicRoutes,
  {
    element: <RequireSessionStatus status="mfa_required" />,
    children: authMfaRoutes,
  },
  {
    element: <RequireAuth />,
    children: [
      ...authPrivateRoutes,
      ...familyRoutes,
      {
        element: <RequireFamilyContext />,
        children: [
          {
            element: <LayoutAutenticado />,
            children: [...dashboardRoutes, ...familyManagementRoutes],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]
