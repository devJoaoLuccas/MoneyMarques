import type { RouteObject } from 'react-router-dom'
import { paths } from '../../shared/routes/paths'
import { ContextPage } from './pages/ContextPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { MfaPage } from './pages/MfaPage'
import { RegisterPage } from './pages/RegisterPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'

/** Telas para quem ainda nao tem sessao (o app as envolve em GuestOnly). */
export const authGuestRoutes: RouteObject[] = [
  { path: paths.login, element: <LoginPage /> },
  { path: paths.register, element: <RegisterPage /> },
  { path: paths.forgotPassword, element: <ForgotPasswordPage /> },
]

/** Acessadas por link de e-mail: funcionam com ou sem sessao. */
export const authPublicRoutes: RouteObject[] = [
  { path: paths.resetPassword, element: <ResetPasswordPage /> },
  { path: paths.verifyEmail, element: <VerifyEmailPage /> },
]

/** Desafio MFA (o app o envolve em RequireSessionStatus "mfa_required"). */
export const authMfaRoutes: RouteObject[] = [{ path: paths.mfa, element: <MfaPage /> }]

/** Autenticado, ainda sem contexto familiar resolvido (o app as envolve em RequireAuth). */
export const authPrivateRoutes: RouteObject[] = [{ path: paths.context, element: <ContextPage /> }]
