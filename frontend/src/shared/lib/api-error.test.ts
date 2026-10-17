import { AxiosError, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { ApiError, toApiError } from './api-error'

function axiosErrorWith(status: number, data: unknown, headers = {}): AxiosError {
  const error = new AxiosError('falhou')
  error.response = { status, data, headers } as AxiosResponse
  return error
}

describe('toApiError', () => {
  it('converte o corpo de erro tipado da API', () => {
    const error = toApiError(
      axiosErrorWith(400, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Verifique os campos informados.',
        errors: { senha: ['A senha deve ter pelo menos 12 caracteres.'] },
      }),
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.message).toBe('Verifique os campos informados.')
    expect(error.fieldErrors).toEqual({ senha: ['A senha deve ter pelo menos 12 caracteres.'] })
  })

  it('le o tempo de espera da limitacao de tentativas (429)', () => {
    const error = toApiError(
      axiosErrorWith(429, {
        statusCode: 429,
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Muitas tentativas.',
        retryAfterSeconds: 42,
      }),
    )
    expect(error.code).toBe('TOO_MANY_ATTEMPTS')
    expect(error.retryAfterSeconds).toBe(42)
  })

  it('falha de rede (sem resposta) vira NETWORK_ERROR com mensagem amigavel', () => {
    const error = toApiError(new AxiosError('Network Error'))
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.status).toBe(0)
    expect(error.message).toMatch(/conex/i)
  })

  it('resposta fora do formato esperado vira UNKNOWN sem vazar detalhes', () => {
    const error = toApiError(axiosErrorWith(500, '<html>stack trace</html>'))
    expect(error.code).toBe('UNKNOWN')
    expect(error.message).not.toContain('stack')
  })

  it('mantem um ApiError que ja foi convertido', () => {
    const original = new ApiError({ status: 401, code: 'INVALID_CREDENTIALS', message: 'x' })
    expect(toApiError(original)).toBe(original)
  })

  it('erro desconhecido (nao Axios) vira UNKNOWN', () => {
    expect(toApiError(new Error('boom')).code).toBe('UNKNOWN')
  })
})
