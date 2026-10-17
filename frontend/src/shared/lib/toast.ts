import { toast } from 'sonner'

const ERROR_DURATION_MS = 8000

/**
 * Notificacoes transitorias (toasts) do sistema. Os modulos usam este helper,
 * nunca o sonner direto, para manter duracao, texto e comportamento padronizados.
 * Erros de validacao de campo continuam inline (associados ao campo).
 */
export const notify = {
  success: (message: string) => toast.success(message),
  info: (message: string) => toast.info(message),
  /** Erros ficam mais tempo na tela para dar tempo de ler. */
  error: (message: string) => toast.error(message, { duration: ERROR_DURATION_MS }),
  dismissAll: () => toast.dismiss(),
}
