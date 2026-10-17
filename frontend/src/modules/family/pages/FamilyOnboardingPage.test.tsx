import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/render'
import { familyService } from '../services/family.service'
import { FamilyOnboardingPage } from './FamilyOnboardingPage'

vi.mock('../services/family.service', () => ({
  familyService: { create: vi.fn(), previewInviteCode: vi.fn(), redeemInviteCode: vi.fn() },
}))
vi.mock('../../auth/services/auth.service', () => ({ authService: { getSession: vi.fn(), logout: vi.fn() } }))

describe('FamilyOnboardingPage: criar ou entrar (FAM-001, D-FAM-009)', () => {
  beforeEach(() => {
    vi.mocked(familyService.previewInviteCode).mockReset()
  })

  it('abre em "Criar família" e oferece a aba "Entrar na família"', () => {
    renderWithProviders(<FamilyOnboardingPage />, { route: '/familia/nova' })
    expect(screen.getByRole('heading', { level: 1, name: 'Crie ou entre em uma família' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Criar família' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Entrar na família' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByLabelText('Nome da família')).toBeInTheDocument()
    expect(screen.queryByLabelText('Código de convite')).not.toBeInTheDocument()
  })

  it('a aba "Entrar na família" mostra o campo de codigo no lugar do formulario de criacao', async () => {
    renderWithProviders(<FamilyOnboardingPage />, { route: '/familia/nova' })
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Entrar na família' }))
    expect(screen.getByLabelText('Código de convite')).toBeInTheDocument()
    expect(screen.getByText(/Recebeu um código de convite/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Nome da família')).not.toBeInTheDocument()
  })

  it('"Sair da conta" fica disponivel nas duas abas', async () => {
    renderWithProviders(<FamilyOnboardingPage />, { route: '/familia/nova' })
    expect(screen.getByRole('button', { name: 'Sair da conta' })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Entrar na família' }))
    expect(screen.getByRole('button', { name: 'Sair da conta' })).toBeInTheDocument()
  })
})
