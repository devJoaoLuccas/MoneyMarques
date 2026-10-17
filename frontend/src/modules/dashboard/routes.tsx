import type { RouteObject } from 'react-router-dom'
import { paths } from '../../shared/routes/paths'
import { DashboardPage } from './pages/DashboardPage'

/** Area do app (o app a envolve em RequireAuth + RequireFamilyContext). */
export const dashboardRoutes: RouteObject[] = [{ path: paths.app, element: <DashboardPage /> }]
