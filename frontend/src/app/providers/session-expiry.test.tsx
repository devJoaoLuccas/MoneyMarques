import { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it } from 'vitest'
import { sessionQueryKey } from '../../modules/auth/hooks/useSession'
import { getSelectedFamily, setSelectedFamily } from '../../modules/auth/state/selected-family'
import { ApiError } from '../../shared/lib/api-error'
import { http, setUnauthorizedHandler } from '../../shared/lib/http'
import { handleSessionExpired, registerSessionExpiry } from './session-expiry'

describe('sessao expirada (CA-007)', () => {
  afterEach(() => setUnauthorizedHandler(null))

  it('descarta todo dado em cache, a familia escolhida e marca a sessao como ausente', () => {
    const client = new QueryClient()
    client.setQueryData(['financas', 'saldo'], { total: 1000 })
    client.setQueryData(sessionQueryKey, { status: 'authenticated' })
    setSelectedFamily('f1')

    handleSessionExpired(client)

    expect(client.getQueryData(['financas', 'saldo'])).toBeUndefined()
    expect(client.getQueryData(sessionQueryKey)).toEqual({ status: 'auth_required' })
    expect(getSelectedFamily()).toBeNull()
  })

  it('o 401 UNAUTHENTICATED do cliente HTTP dispara a limpeza', async () => {
    const client = new QueryClient()
    client.setQueryData(['financas', 'saldo'], { total: 1000 })
    registerSessionExpiry(client)

    const original = http.defaults.adapter
    http.defaults.adapter = () =>
      Promise.reject(
        Object.assign(new Error('x'), {
          isAxiosError: true,
          response: { status: 401, data: { code: 'UNAUTHENTICATED', message: 'expirou', statusCode: 401 } },
        }),
      )
    await expect(http.get('/dados-privados')).rejects.toBeInstanceOf(ApiError)
    http.defaults.adapter = original

    expect(client.getQueryData(['financas', 'saldo'])).toBeUndefined()
    expect(client.getQueryData(sessionQueryKey)).toEqual({ status: 'auth_required' })
  })
})
