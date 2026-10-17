/** Caminhos de rota da aplicacao (fonte unica; nenhum modulo escreve URL solta). */
export const paths = {
  root: '/',
  login: '/login',
  register: '/cadastro',
  forgotPassword: '/esqueci-senha',
  resetPassword: '/redefinir-senha',
  verifyEmail: '/verificar-email',
  mfa: '/verificacao-mfa',
  context: '/contexto',
  familyOnboarding: '/familia/nova',
  familyInvites: '/familia/convites',
  familyInviteLink: '/convite',
  familyMembers: '/familia/integrantes',
  familySentInvites: '/familia/convites-enviados',
  app: '/app',
} as const

export type AppPath = (typeof paths)[keyof typeof paths]
