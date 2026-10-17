import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { ApiError } from './api-error'

const SECONDS_PER_MINUTE = 60

/**
 * Aplica os erros por campo devolvidos pelo servidor (primeira mensagem de cada
 * campo do formulario). Retorna true se algum erro foi aplicado.
 */
export function applyFieldErrors<TFieldValues extends FieldValues>(
  error: ApiError,
  knownFields: ReadonlyArray<Path<TFieldValues>>,
  setError: UseFormSetError<TFieldValues>,
): boolean {
  let applied = false
  for (const field of knownFields) {
    const message = error.fieldErrors?.[field]?.[0]
    if (message) {
      setError(field, { type: 'server', message })
      applied = true
    }
  }
  return applied
}

function formatWait(seconds: number): string {
  if (seconds < SECONDS_PER_MINUTE) return `${seconds} segundos`
  const minutes = Math.ceil(seconds / SECONDS_PER_MINUTE)
  return minutes === 1 ? '1 minuto' : `${minutes} minutos`
}

/** Texto de alerta de formulario para qualquer ApiError (inclui espera da limitacao de tentativas). */
export function describeApiError(error: ApiError): string {
  if (error.code === 'TOO_MANY_ATTEMPTS' && error.retryAfterSeconds) {
    return `${error.message} Tente novamente em ${formatWait(error.retryAfterSeconds)}.`
  }
  return error.message
}
