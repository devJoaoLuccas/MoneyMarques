import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/api-error'
import { renderWithProviders } from '../../../test/render'
import type { ActiveFamily } from '../hooks/useFamily'
import { familyService } from '../services/family.service'
import type { Invite, Page } from '../types'
import { SentInvitesPanel } from './SentInvitesPanel'

vi.mock('../services/family.service', () => ({
  familyService: { listInvites: vi.fn(), issueInvite: vi.fn(), revokeInvite: vi.fn(), resendInvite: vi.fn() },
}))

const family: ActiveFamily = { uid: 'f1', nome: 'Silva', papel: 'ADMINISTRADOR' }

const invite = (over: Partial<Invite> = {}): Invite => ({
  uid: 'c1',
  email: 'bruno@exemplo.com',
  papel: 'INTEGRANTE',
  situacao: 'PENDENTE',
  expiraEm: '2026-10-25T12:00:00.000Z',
  criadoEm: '2026-10-18T12:00:00.000Z',
  respondidoEm: null,
  ...over,
})

const page = (itens: Invite[]): Page<Invite> => ({ itens, pagina: 1, tamanho: 10, total: itens.length })

describe('SentInvitesPanel (FAM-005)', () => {
  beforeEach(() => {
    vi.mocked(familyService.listInvites)
      .mockReset()
      .mockResolvedValue(page([invite()]))
    vi.mocked(familyService.issueInvite).mockReset().mockResolvedValue(invite())
    vi.mocked(familyService.revokeInvite).mockReset().mockResolvedValue(undefined)
    vi.mocked(familyService.resendInvite).mockReset().mockResolvedValue(undefined)
  })

  it('lista convites com situacao, papel e datas', async () => {
    renderWithProviders(<SentInvitesPanel family={family} />)
    expect(await screen.findByText('bruno@exemplo.com')).toBeInTheDocument()
    expect(screen.getAllByText('Pendente').length).toBeGreaterThan(0)
    expect(screen.getByText(/enviado em 18\/10\/2026/i)).toBeInTheDocument()
    expect(screen.getByText(/válido até 25\/10\/2026/i)).toBeInTheDocument()
  })

  it('estado vazio orienta a convidar alguem', async () => {
    vi.mocked(familyService.listInvites).mockResolvedValue(page([]))
    renderWithProviders(<SentInvitesPanel family={family} />)
    expect(await screen.findByText('Nenhum convite por aqui')).toBeInTheDocument()
  })

  it('valida o e-mail no cliente antes de chamar a API', async () => {
    renderWithProviders(<SentInvitesPanel family={family} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('E-mail da pessoa'), 'invalido')
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }))

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(familyService.issueInvite).not.toHaveBeenCalled()
  })

  it('emite o convite com o papel escolhido e confirma o envio', async () => {
    renderWithProviders(<SentInvitesPanel family={family} />)
    const user = userEvent.setup()
    await screen.findByText('bruno@exemplo.com')

    await user.type(screen.getByLabelText('E-mail da pessoa'), '  carla@exemplo.com ')
    await user.selectOptions(screen.getByLabelText('Papel na família'), 'VISUALIZADOR')
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }))

    await waitFor(() =>
      expect(familyService.issueInvite).toHaveBeenCalledWith('f1', {
        email: 'carla@exemplo.com',
        papel: 'VISUALIZADOR',
      }),
    )
    expect(await screen.findByText(/convite enviado para carla@exemplo.com/i)).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail da pessoa')).toHaveValue('')
  })

  it('erros do servidor (duplicado/ja integrante) aparecem em alerta', async () => {
    vi.mocked(familyService.issueInvite).mockRejectedValue(
      new ApiError({
        status: 409,
        code: 'INVITE_ALREADY_PENDING',
        message: 'Já existe um convite pendente para este e-mail.',
      }),
    )
    renderWithProviders(<SentInvitesPanel family={family} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('E-mail da pessoa'), 'bruno@exemplo.com')
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/já existe um convite pendente/i)
  })

  it('limite de emissao mostra o tempo de espera', async () => {
    vi.mocked(familyService.issueInvite).mockRejectedValue(
      new ApiError({ status: 429, code: 'TOO_MANY_ATTEMPTS', message: 'Muitas tentativas.', retryAfterSeconds: 90 }),
    )
    renderWithProviders(<SentInvitesPanel family={family} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('E-mail da pessoa'), 'novo@exemplo.com')
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/tente novamente em 2 minutos/i)
  })

  it('revogar descreve o efeito, confirma e chama a API', async () => {
    renderWithProviders(<SentInvitesPanel family={family} />)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /revogar convite para bruno@exemplo.com/i }))
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText(/deixará de funcionar/i)).toBeInTheDocument()
    expect(familyService.revokeInvite).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: /revogar convite/i }))
    await waitFor(() => expect(familyService.revokeInvite).toHaveBeenCalledWith('f1', 'c1'))
    expect(await screen.findByText(/convite para bruno@exemplo.com revogado/i)).toBeInTheDocument()
  })

  it('reenviar chama a API e informa que o link anterior foi invalidado', async () => {
    renderWithProviders(<SentInvitesPanel family={family} />)
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: /reenviar convite para bruno@exemplo.com/i }))

    await waitFor(() => expect(familyService.resendInvite).toHaveBeenCalledWith('f1', 'c1'))
    expect(await screen.findByText(/link anterior foi invalidado/i)).toBeInTheDocument()
  })

  it('convites ja respondidos nao oferecem reenviar nem revogar', async () => {
    vi.mocked(familyService.listInvites).mockResolvedValue(page([invite({ situacao: 'ACEITO' })]))
    renderWithProviders(<SentInvitesPanel family={family} />)
    await screen.findByText('bruno@exemplo.com')

    expect(screen.queryByRole('button', { name: /reenviar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /revogar/i })).not.toBeInTheDocument()
  })
})
