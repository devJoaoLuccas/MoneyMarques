import { describe, expect, it, vi } from 'vitest'
import { ApiError } from './api-error'
import { applyFieldErrors, describeApiError } from './form-errors'

const validation = (fieldErrors: Record<string, string[]>) =>
  new ApiError({ status: 400, code: 'VALIDATION_ERROR', message: 'Verifique os campos.', fieldErrors })

describe('applyFieldErrors (CA-002, CA-008: erros do servidor por campo)', () => {
  it('aplica a primeira mensagem de cada campo conhecido', () => {
    const setError = vi.fn()
    const applied = applyFieldErrors(
      validation({ senha: ['A senha deve ter pelo menos 12 caracteres.', 'outra'], email: ['E-mail inválido.'] }),
      ['email', 'senha'],
      setError,
    )
    expect(applied).toBe(true)
    expect(setError).toHaveBeenCalledWith('senha', { type: 'server', message: 'A senha deve ter pelo menos 12 caracteres.' })
    expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'E-mail inválido.' })
  })

  it('ignora campos que o formulario nao tem', () => {
    const setError = vi.fn()
    expect(applyFieldErrors(validation({ desconhecido: ['x'] }), ['email'], setError)).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })

  it('nao faz nada quando o erro nao traz erros por campo', () => {
    const setError = vi.fn()
    const error = new ApiError({ status: 401, code: 'INVALID_CREDENTIALS', message: 'x' })
    expect(applyFieldErrors(error, ['email'], setError)).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })
})

describe('describeApiError', () => {
  it('usa a mensagem da API para erros comuns', () => {
    const error = new ApiError({ status: 401, code: 'INVALID_CREDENTIALS', message: 'Não foi possível entrar.' })
    expect(describeApiError(error)).toBe('Não foi possível entrar.')
  })

  it.each([
    [42, '42 segundos'],
    [60, '1 minuto'],
    [90, '2 minutos'],
  ])('limitacao de tentativas informa quando tentar de novo (%i s)', (seconds, expected) => {
    const error = new ApiError({
      status: 429,
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Muitas tentativas.',
      retryAfterSeconds: seconds,
    })
    expect(describeApiError(error)).toBe(`Muitas tentativas. Tente novamente em ${expected}.`)
  })

  it('limitacao sem tempo informado devolve so a mensagem', () => {
    const error = new ApiError({ status: 429, code: 'TOO_MANY_ATTEMPTS', message: 'Muitas tentativas.' })
    expect(describeApiError(error)).toBe('Muitas tentativas.')
  })
})
