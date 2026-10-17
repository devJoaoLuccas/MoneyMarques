import type { RouteObject } from 'react-router-dom'
import { paths } from '../../shared/routes/paths'
import { CartoesPage } from './pages/CartoesPage'
import { DashboardPage } from './pages/DashboardPage'
import { PatrimonioPage } from './pages/PatrimonioPage'
import { ProjecoesPage } from './pages/ProjecoesPage'
import { ReceitasDespesasPage } from './pages/ReceitasDespesasPage'
import { VencimentosPage } from './pages/VencimentosPage'
import { VisaoGeralFinanceiraPage } from './pages/VisaoGeralFinanceiraPage'

/** Area do app (o app a envolve em RequireAuth + RequireFamilyContext + LayoutAutenticado). */
export const dashboardRoutes: RouteObject[] = [
  { path: paths.app, element: <DashboardPage /> },
  { path: paths.dashboard, element: <VisaoGeralFinanceiraPage /> },
  { path: paths.dashboardIncomeExpenses, element: <ReceitasDespesasPage /> },
  { path: paths.dashboardCards, element: <CartoesPage /> },
  { path: paths.dashboardNetWorth, element: <PatrimonioPage /> },
  { path: paths.dashboardProjections, element: <ProjecoesPage /> },
  { path: paths.dashboardDueDates, element: <VencimentosPage /> },
]
