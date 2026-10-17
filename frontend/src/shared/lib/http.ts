import axios from 'axios'
import { toApiError } from './api-error'

/**
 * Cliente HTTP unico. A SPA e a API compartilham a origem (proxy em dev),
 * entao o cookie de sessao HttpOnly viaja sozinho. O header X-CSRF-Protection
 * e exigido pelo backend em toda escrita (RN-AUTH-006).
 */
export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15_000,
  headers: { 'X-CSRF-Protection': '1' },
})

let unauthorizedHandler: (() => void) | null = null

/** Registra o que fazer quando a sessao expira no meio do uso (CA-007). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)
    if (apiError.code === 'UNAUTHENTICATED') unauthorizedHandler?.()
    return Promise.reject(apiError)
  },
)
