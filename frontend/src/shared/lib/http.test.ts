import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api-error'
import { http, setUnauthorizedHandler } from './http'

function failWith(status: number, data: unknown) {
  return (config: InternalAxiosRequestConfig) =>
    Promise.reject(
      new AxiosError('falhou', undefined, config, null, {
        status,
        data,
        headers: {},
        config,
        statusText: '',
      } as AxiosResponse),
    )
}

describe('http (RN-AUTH-006, RN-AUTH-007, CA-007)', () => {
  const originalAdapter = http.defaults.adapter
  afterEach(() => {
    http.defaults.adapter = originalAdapter
    setUnauthorizedHandler(null)
  })

  it('usa a API na mesma origem, com cookie de sessao e header anti-CSRF', () => {
    expect(http.defaults.baseURL).toBe('/api')
    expect(http.defaults.withCredentials).toBe(true)
    expect(http.defaults.headers['X-CSRF-Protection']).toBe('1')
  })

  it('converte falhas em ApiError tipado', async () => {
    http.defaults.adapter = failWith(401, {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Não foi possível entrar.',
    })
    await expect(http.post('/auth/login')).rejects.toBeInstanceOf(ApiError)
    await expect(http.post('/auth/login')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 })
  })

  it('sessao expirada (UNAUTHENTICATED) aciona o handler para limpar dados sensiveis', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    http.defaults.adapter = failWith(401, {
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: 'Sessão ausente ou expirada.',
    })
    await expect(http.get('/qualquer-coisa-privada')).rejects.toBeInstanceOf(ApiError)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('credenciais invalidas NAO acionam o handler de sessao expirada', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    http.defaults.adapter = failWith(401, {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'x',
    })
    await expect(http.post('/auth/login')).rejects.toBeInstanceOf(ApiError)
    expect(handler).not.toHaveBeenCalled()
  })
})
