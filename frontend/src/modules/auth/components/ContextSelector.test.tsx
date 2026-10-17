import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/render'
import { authService } from '../services/auth.service'
import { getSelectedFamily } from '../state/selected-family'
import type { SessionView } from '../types'
import { ContextSelector } from './ContextSelector'

vi.mock('../services/auth.service', () => ({ authService: { getSession: vi.fn() } }))

const multiple: SessionView = {
  status: 'authenticated',
  usuario: { uid: 'u1', nomeCompleto: 'Ana', email: 'ana@exemplo.com' },
  mfaHabilitado: false,
  contexto: {
    tipo: 'multiplo',
    familias: [
      { uid: 'f1', nome: 'Família Silva', papel: 'ADMINISTRADOR' },
      { uid: 'f2', nome: 'Família Souza', papel: 'VISUALIZADOR' },
    ],
    convitesPendentes: [],
  },
}

describe('ContextSelector (AUTH-005)', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.mocked(authService.getSession).mockReset().mockResolvedValue(multiple)
  })

  it('lista as familias do usuario com o papel de cada uma', async () => {
    renderWithProviders(<ContextSelector />, { route: '/contexto' })
    expect(await screen.findByRole('button', { name: /família silva/i })).toHaveTextContent(/administrador/i)
    expect(screen.getByRole('button', { name: /família souza/i })).toHaveTextContent(/visualizador/i)
  })

  it('ao escolher, guarda a preferencia da aba e segue para a area do app', async () => {
    renderWithProviders(<ContextSelector />, { route: '/contexto' })
    await userEvent.setup().click(await screen.findByRole('button', { name: /família souza/i }))

    expect(getSelectedFamily()).toBe('f2')
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/app'))
  })
})
