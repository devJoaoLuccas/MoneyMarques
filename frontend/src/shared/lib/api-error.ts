import axios from 'axios'

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'TOO_MANY_ATTEMPTS'
  | 'UNAUTHENTICATED'
  | 'MFA_REQUIRED'
  | 'EMAIL_VERIFICATION_REQUIRED'
  | 'INVALID_TOKEN'
  | 'INVALID_INVITE_CODE'
  | 'INVITE_CODE_ACTIVE'
  | 'INVITE_CODE_HIDDEN'
  | 'INVALID_MFA_CODE'
  | 'CSRF_REJECTED'
  | 'MFA_ALREADY_ENABLED'
  | 'MFA_NOT_CONFIGURED'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'LAST_ADMIN_REQUIRED'
  | 'ALREADY_MEMBER'
  | 'INVITE_ALREADY_PENDING'
  | 'INVITE_NOT_PENDING'
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN'

export type FieldErrors = Record<string, string[]>

interface ApiErrorInit {
  status: number
  code: ApiErrorCode
  message: string
  fieldErrors?: FieldErrors
  retryAfterSeconds?: number
}

const NETWORK_MESSAGE = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
const UNKNOWN_MESSAGE = 'Ocorreu um erro inesperado. Tente novamente em instantes.'

/** Erro tipado de API, independente de Axios, consumido por hooks e formularios. */
export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly fieldErrors?: FieldErrors
  readonly retryAfterSeconds?: number

  constructor(init: ApiErrorInit) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.fieldErrors = init.fieldErrors
    this.retryAfterSeconds = init.retryAfterSeconds
  }
}

interface ApiErrorBody {
  code: ApiErrorCode
  message: string
  errors?: FieldErrors
  retryAfterSeconds?: number
}

function isApiErrorBody(data: unknown): data is ApiErrorBody {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as ApiErrorBody).code === 'string' &&
    typeof (data as ApiErrorBody).message === 'string'
  )
}

/** Normaliza qualquer falha (Axios, rede, desconhecida) em ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return new ApiError({ status: 0, code: 'NETWORK_ERROR', message: NETWORK_MESSAGE })
    }
    const { status, data } = error.response
    if (isApiErrorBody(data)) {
      return new ApiError({
        status,
        code: data.code,
        message: data.message,
        fieldErrors: data.errors,
        retryAfterSeconds: data.retryAfterSeconds,
      })
    }
    return new ApiError({ status, code: 'UNKNOWN', message: UNKNOWN_MESSAGE })
  }

  return new ApiError({ status: 0, code: 'UNKNOWN', message: UNKNOWN_MESSAGE })
}
