import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/api-error'
import { renderWithProviders } from '../../../test/render'
import { authService } from '../../auth/services/auth.service'
import { getSelectedFamily } from '../../auth'
import { familyService } from '../services/family.service'
import { CreateFamilyForm } from './CreateFamilyForm'

vi.mock('../services/family.service', () => ({ familyService: { create: vi.fn() } }))
vi.mock('../../auth/services/auth.service', () => ({ authService: { getSession: vi.fn(), logout: vi.fn() } }))

describe('CreateFamilyForm (FAM-001)', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.mocked(familyService.create).mockReset()
    vi.mocked(authService.getSession).mockReset().mockResolvedValue({ status: 'auth_required' })
  })

  it('FAM-001: mostra erro de nome curto sem chamar a API', async () => {
    renderWithProviders(<CreateFamilyForm />, { route: '/familia/nova' })
    await userEvent.setup().type(screen.getByLabelText('Nome da família'), 'ab')
    await userEvent.setup().click(screen.getByRole('button', { name: /criar família/i }))

    expect(await screen.findByText(/entre 3 e 40 caracteres/i, { selector: '[role="alert"] *' })).toBeInTheDocument()
    expect(familyService.create).not.toHaveBeenCalled()
  })

  it('oferece os icones predefinidos e envia o escolhido', async () => {
    vi.mocked(familyService.create).mockResolvedValue({
      uid: 'f1',
      nome: 'Família Silva',
      descricao: null,
      avatar: 'familia',
      papel: 'ADMINISTRADOR',
    })
    renderWithProviders(<CreateFamilyForm />, { route: '/familia/nova' })
    const user = userEvent.setup()

    expect(screen.getAllByRole('radio')).toHaveLength(3)
    await user.type(screen.getByLabelText('Nome da família'), '  Família   Silva ')
    await user.click(screen.getByRole('radio', { name: /família/i }))
    await user.click(screen.getByRole('button', { name: /criar família/i }))

    await waitFor(() =>
      expect(familyService.create).toHaveBeenCalledWith({ nome: 'Família Silva', descricao: '', avatar: 'familia' }),
    )
    // Guarda a familia criada como contexto e segue para o app.
    await waitFor(() => expect(getSelectedFamily()).toBe('f1'))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/app'))
  })

  it('mostra erro por campo devolvido pelo servidor', async () => {
    vi.mocked(familyService.create).mockRejectedValue(
      new ApiError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Verifique os campos informados.',
        fieldErrors: { nome: ['O nome deve ter entre 3 e 40 caracteres.'] },
      }),
    )
    renderWithProviders(<CreateFamilyForm />, { route: '/familia/nova' })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Nome da família'), 'Família Silva')
    await user.click(screen.getByRole('button', { name: /criar família/i }))

    expect(await screen.findByText('O nome deve ter entre 3 e 40 caracteres.')).toBeInTheDocument()
  })

  it('falha de rede mostra alerta e permite tentar de novo', async () => {
    vi.mocked(familyService.create).mockRejectedValue(
      new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Sem conexão.' }),
    )
    renderWithProviders(<CreateFamilyForm />, { route: '/familia/nova' })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Nome da família'), 'Família Silva')
    await user.click(screen.getByRole('button', { name: /criar família/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão.')
    expect(screen.getByRole('button', { name: /criar família/i })).toBeEnabled()
  })
})
