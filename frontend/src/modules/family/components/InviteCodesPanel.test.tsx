import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/render'
import { familyService } from '../services/family.service'
import type { InviteCode } from '../types'
import { InviteCodesPanel } from './InviteCodesPanel'

vi.mock('../services/family.service', () => ({
  familyService: { issueInviteCode: vi.fn(), listInviteCodes: vi.fn(), revokeInviteCode: vi.fn() },
}))

const family = { uid: 'f1', nome: 'Silva', papel: 'ADMINISTRADOR' as const }

const codigo = (extra: Partial<InviteCode> = {}): InviteCode => ({
  uid: 'k1',
  papel: 'INTEGRANTE',
  situacao: 'ATIVO',
  expiraEm: '2026-10-18T15:00:00.000Z',
  criadoEm: '2026-10-17T15:00:00.000Z',
  usadoEm: null,
  ...extra,
})

describe('InviteCodesPanel (D-FAM-009)', () => {
  beforeEach(() => {
    vi.mocked(familyService.issueInviteCode).mockReset()
    vi.mocked(familyService.listInviteCodes).mockReset().mockResolvedValue([])
    vi.mocked(familyService.revokeInviteCode).mockReset()
  })

  it('explica as regras do codigo e oferece so papeis sem administrador', async () => {
    renderWithProviders(<InviteCodesPanel family={family} />)
    expect(await screen.findByText(/24 horas e para uma única pessoa/)).toBeInTheDocument()
    const select = screen.getByLabelText('Papel de quem entrar com o código')
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Integrante', 'Visualizador'])
  })

  it('gera o codigo com o papel escolhido e o exibe uma unica vez', async () => {
    vi.mocked(familyService.issueInviteCode).mockResolvedValue({
      ...codigo({ papel: 'VISUALIZADOR' }),
      codigo: 'ABCD-EFGH',
    })
    renderWithProviders(<InviteCodesPanel family={family} />)
    const user = userEvent.setup()
    await user.selectOptions(await screen.findByLabelText('Papel de quem entrar com o código'), 'VISUALIZADOR')
    await user.click(screen.getByRole('button', { name: 'Gerar código' }))

    expect(await screen.findByText('ABCD-EFGH')).toBeInTheDocument()
    expect(screen.getByText(/aparece só agora/)).toBeInTheDocument()
    expect(screen.getByText(/Entra como Visualizador/)).toBeInTheDocument()
    expect(familyService.issueInviteCode).toHaveBeenCalledWith('f1', 'VISUALIZADOR')
  })

  it('a lista nunca traz o codigo, so situacao e papel', async () => {
    vi.mocked(familyService.listInviteCodes).mockResolvedValue([
      codigo(),
      codigo({ uid: 'k2', situacao: 'USADO', usadoEm: '2026-10-17T16:00:00.000Z' }),
    ])
    renderWithProviders(<InviteCodesPanel family={family} />)
    const lista = await screen.findByRole('list', { name: 'Códigos gerados' })
    expect(within(lista).getByText('Ativo')).toBeInTheDocument()
    expect(within(lista).getByText('Usado')).toBeInTheDocument()
    // So codigos ativos podem ser revogados.
    expect(within(lista).getAllByRole('button', { name: /revogar código/i })).toHaveLength(1)
  })

  it('revogar pede confirmacao explicita', async () => {
    vi.mocked(familyService.listInviteCodes).mockResolvedValue([codigo()])
    vi.mocked(familyService.revokeInviteCode).mockResolvedValue(undefined)
    renderWithProviders(<InviteCodesPanel family={family} />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /revogar código/i }))
    expect(familyService.revokeInviteCode).not.toHaveBeenCalled()

    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Revogar código' }))
    expect(familyService.revokeInviteCode).toHaveBeenCalledWith('f1', 'k1')
    expect(await screen.findByText('Código revogado.')).toBeInTheDocument()
  })

  it('erro ao gerar: mostra a mensagem e nao exibe codigo', async () => {
    vi.mocked(familyService.issueInviteCode).mockRejectedValue(new Error('rede'))
    renderWithProviders(<InviteCodesPanel family={family} />)
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Gerar código' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText(/aparece só agora/)).not.toBeInTheDocument()
  })
})
