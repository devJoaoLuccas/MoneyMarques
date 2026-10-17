import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppProviders } from './providers/AppProviders'
import { appRoutes } from './router/app-routes'

const router = createBrowserRouter(appRoutes)

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
