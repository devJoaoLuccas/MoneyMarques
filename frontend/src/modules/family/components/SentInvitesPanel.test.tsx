import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/api-error'
import { renderWithProviders } from '../../../test/render'
import type { ActiveFamily } from '../hooks/useFamily'
import { familyService } from '../services/family.service'
import type { Invite, InviteCode, IssuedInviteCode, Page } from '../types'
import { SentInvitesPanel } from './SentInvitesPanel'

vi.mock('../services/family.service', () => ({
  familyService: {
    listInvites: vi.fn(),
    issueInvite: vi.fn(),
    revokeInvite: vi.fn(),
    resendInvite: vi.fn(),
    listInviteCodes: vi.fn(),
    issueInviteCode: vi.fn(),
    getActiveInviteCode: vi.fn(),
    revokeInviteCode: vi.fn(),
  },
}))

const family: ActiveFamily = { uid: 'f1', nome: 'Silva', papel: 'ADMINISTRADOR' }

const invite = (over: Partial<Invite> = {}): Invite => ({
  uid: 'c1',
  origem: 'email',
  nome: null,
  email: 'bruno@exemplo.com',
  papel: 'INTEGRANTE',
  situacao: 'PENDENTE',
  expiraEm: '2026-10-25T12:00:00.000Z',
  criadoEm: '2026-10-18T12:00:00.000Z',
  respondidoEm: null,
  ...over,
})

const code = (over: Partial<InviteCode> = {}): InviteCode => ({
  uid: 'k1',
  papel: 'INTEGRANTE',
  situacao: 'ATIVO',
  expiraEm: '2026-10-19T15:00:00.000Z',
  criadoEm: '2026-10-18T15:00:00.000Z',
  usadoEm: null,
  ...over,
})

const page = (itens: Invite[]): Page<Invite> => ({ itens, pagina: 1, tamanho: 10, total: itens.length })

describe('SentInvitesPanel (FAM-005, D-FAM-009)', () => {
  beforeEach(() => {
    vi.mocked(familyService.listInvites)
      .mockReset()
      .mockResolvedValue(page([invite()]))
    vi.mocked(familyService.issueInvite).mockReset().mockResolvedValue(invite())
    vi.mocked(familyService.revokeInvite).mockReset().mockResolvedValue(undefined)
    vi.mocked(familyService.resendInvite).mockReset().mockResolvedValue(undefined)
    vi.mocked(familyService.listInviteCodes).mockReset().mockResolvedValue([])
    vi.mocked(familyService.issueInviteCode).mockReset()
    vi.mocked(familyService.getActiveInviteCode).mockReset()
    vi.mocked(familyService.revokeInviteCode).mockReset().mockResolvedValue(undefined)
  })

  it('lista convites com situacao, papel e datas', async () => {
    renderWithProviders(<SentInvitesPanel family={family} />)
    expect(await screen.findByText('bruno@exemplo.com')).toBeInTheDocument()
    expect(screen.getAllByText('Pendente').length).toBeGreaterThan(0)
    expect(screen.getByText(/enviado em 18\/10\/2026/i)).toBeInTheDocument()
    expect(screen.getByText(/válido até 25\/10\/2026/i)).toBeInTheDocument()
  })

  it('codigo usado aparece como convite aceito, no mesmo padrao, com quem entrou', async () => {
    vi.mocked(familyService.listInvites).mockResolvedValue(
      page([
        invite({
          uid: 'k9',
          origem: 'codigo',
          nome: 'Bia Souza',
          email: 'bia@exemplo.com',
          papel: 'VISUALIZADOR',
          situacao: 'ACEITO',
          criadoEm: '2026-10-18T12:00:00.000Z',
          respondidoEm: '2026-10-19T09:00:00.000Z',
        }),
        invite(),
      ]),
    )
    renderWithProviders(<SentInvitesPanel family={family} />)
    const titulo = await screen.findByText('Bia Souza')
    const cartao = titulo.closest('li') as HTMLElement
    expect(within(cartao).getByText('Aceito')).toBeInTheDocument()
    expect(within(cartao).getByText('Por código')).toBeInTheDocument()
    expect(
      within(cartao).getByText(
        /bia@exemplo.com · Visualizador · Código gerado em 18\/10\/2026 · Entrou em 19\/10\/2026/,
      ),
    ).toBeInTheDocument()
    // Convite por e-mail segue igual, e o codigo usado nao oferece reenviar/revogar.
    expect(screen.getByText('bruno@exemplo.com')).toBeInTheDocument()
    expect(within(cartao).queryByRole('button')).not.toBeInTheDocument()
  })

  it('titulo e os dois botoes de acao ficam na mesma linha', async () => {
    renderWithProviders(<SentInvitesPanel family={family} />)
    const titulo = await screen.findByRole('heading', { name: 'Convites enviados' })
    const linha = titulo.parentElement as HTMLElement
    expect(within(linha).getByRole('button', { name: 'Enviar convite' })).toBeInTheDocument()
    expect(within(linha).getByRole('button', { name: 'Gerar código' })).toBeInTheDocument()
  })

  it('estado vazio orienta a convidar alguem', async () => {
    vi.mocked(familyService.listInvites).mockResolvedValue(page([]))
    renderWithProviders(<SentInvitesPanel family={family} />)
    expect(await screen.findByText('Nenhum convite por aqui')).toBeInTheDocument()
  })

  describe('Enviar convite (modal)', () => {
    async function abrir() {
      renderWithProviders(<SentInvitesPanel family={family} />)
      const user = userEvent.setup()
      await screen.findByText('bruno@exemplo.com')
      await user.click(screen.getByRole('button', { name: 'Enviar convite' }))
      return { user, dialog: await screen.findByRole('dialog', { name: 'Enviar convite' }) }
    }

    it('abre o modal com e-mail e papel', async () => {
      const { dialog } = await abrir()
      expect(within(dialog).getByLabelText('E-mail da pessoa')).toBeInTheDocument()
      expect(within(dialog).getByLabelText('Papel na família')).toBeInTheDocument()
    })

    it('valida o e-mail no cliente antes de chamar a API', async () => {
      const { user, dialog } = await abrir()
      await user.type(within(dialog).getByLabelText('E-mail da pessoa'), 'invalido')
      await user.click(within(dialog).getByRole('button', { name: 'Enviar convite' }))

      expect(await within(dialog).findByText('Informe um e-mail válido.')).toBeInTheDocument()
      expect(familyService.issueInvite).not.toHaveBeenCalled()
    })

    it('emite o convite com o papel escolhido, fecha o modal e confirma o envio', async () => {
      const { user, dialog } = await abrir()
      await user.type(within(dialog).getByLabelText('E-mail da pessoa'), '  carla@exemplo.com ')
      await user.selectOptions(within(dialog).getByLabelText('Papel na família'), 'VISUALIZADOR')
      await user.click(within(dialog).getByRole('button', { name: 'Enviar convite' }))

      await waitFor(() =>
        expect(familyService.issueInvite).toHaveBeenCalledWith('f1', {
          email: 'carla@exemplo.com',
          papel: 'VISUALIZADOR',
        }),
      )
      expect(await screen.findByText(/convite enviado para carla@exemplo.com/i)).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('erros do servidor (duplicado/ja integrante) aparecem no modal, que continua aberto', async () => {
      vi.mocked(familyService.issueInvite).mockRejectedValue(
        new ApiError({
          status: 409,
          code: 'INVITE_ALREADY_PENDING',
          message: 'Já existe um convite pendente para este e-mail.',
        }),
      )
      const { user, dialog } = await abrir()
      await user.type(within(dialog).getByLabelText('E-mail da pessoa'), 'bruno@exemplo.com')
      await user.click(within(dialog).getByRole('button', { name: 'Enviar convite' }))

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(/já existe um convite pendente/i)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('limite de emissao mostra o tempo de espera', async () => {
      vi.mocked(familyService.issueInvite).mockRejectedValue(
        new ApiError({ status: 429, code: 'TOO_MANY_ATTEMPTS', message: 'Muitas tentativas.', retryAfterSeconds: 90 }),
      )
      const { user, dialog } = await abrir()
      await user.type(within(dialog).getByLabelText('E-mail da pessoa'), 'novo@exemplo.com')
      await user.click(within(dialog).getByRole('button', { name: 'Enviar convite' }))

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(/tente novamente em 2 minutos/i)
    })

    it('Cancelar fecha sem enviar', async () => {
      const { user, dialog } = await abrir()
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(familyService.issueInvite).not.toHaveBeenCalled()
    })
  })

  describe('Codigo de convite (modal)', () => {
    it('sem codigo ativo o botao e "Gerar código"; gera com o papel escolhido e mostra o codigo', async () => {
      const gerado: IssuedInviteCode = { ...code({ papel: 'VISUALIZADOR' }), codigo: 'ABCD-EFGH' }
      vi.mocked(familyService.issueInviteCode).mockResolvedValue(gerado)
      renderWithProviders(<SentInvitesPanel family={family} />)
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Gerar código' }))

      const dialog = await screen.findByRole('dialog', { name: 'Gerar código de convite' })
      const select = within(dialog).getByLabelText('Papel de quem entrar com o código')
      expect(
        within(select)
          .getAllByRole('option')
          .map((o) => o.textContent),
      ).toEqual(['Integrante', 'Visualizador'])
      await user.selectOptions(select, 'VISUALIZADOR')
      await user.click(within(dialog).getByRole('button', { name: 'Gerar código' }))

      expect(await screen.findByText('ABCD-EFGH')).toBeInTheDocument()
      expect(screen.getByText(/Entra como Visualizador/)).toBeInTheDocument()
      expect(familyService.issueInviteCode).toHaveBeenCalledWith('f1', 'VISUALIZADOR')
    })

    it('com codigo ativo o botao vira "Visualizar código" e o modal mostra o codigo', async () => {
      vi.mocked(familyService.listInviteCodes).mockResolvedValue([code()])
      vi.mocked(familyService.getActiveInviteCode).mockResolvedValue({ ...code(), codigo: 'WXYZ-2345' })
      renderWithProviders(<SentInvitesPanel family={family} />)
      const user = userEvent.setup()

      await user.click(await screen.findByRole('button', { name: 'Visualizar código' }))
      expect(screen.queryByRole('button', { name: 'Gerar código' })).not.toBeInTheDocument()
      const dialog = await screen.findByRole('dialog', { name: 'Código de convite' })
      expect(await within(dialog).findByText('WXYZ-2345')).toBeInTheDocument()
      expect(within(dialog).getByText(/Válido até 19\/10\/2026/)).toBeInTheDocument()
      expect(familyService.getActiveInviteCode).toHaveBeenCalledWith('f1')
    })

    it('codigos usados, revogados ou expirados nao contam como ativo', async () => {
      vi.mocked(familyService.listInviteCodes).mockResolvedValue([
        code({ uid: 'k2', situacao: 'USADO' }),
        code({ uid: 'k3', situacao: 'REVOGADO' }),
        code({ uid: 'k4', situacao: 'EXPIRADO' }),
      ])
      renderWithProviders(<SentInvitesPanel family={family} />)
      expect(await screen.findByRole('button', { name: 'Gerar código' })).toBeInTheDocument()
    })

    it('revogar pede confirmacao, fecha o modal e volta a oferecer "Gerar código"', async () => {
      vi.mocked(familyService.listInviteCodes).mockResolvedValueOnce([code()]).mockResolvedValue([])
      vi.mocked(familyService.getActiveInviteCode).mockResolvedValue({ ...code(), codigo: 'WXYZ-2345' })
      renderWithProviders(<SentInvitesPanel family={family} />)
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Visualizar código' }))
      const dialog = await screen.findByRole('dialog', { name: 'Código de convite' })
      await user.click(await within(dialog).findByRole('button', { name: 'Revogar código' }))
      expect(familyService.revokeInviteCode).not.toHaveBeenCalled()

      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Revogar código' }))
      await waitFor(() => expect(familyService.revokeInviteCode).toHaveBeenCalledWith('f1', 'k1'))
      expect(await screen.findByText('Código revogado.')).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(await screen.findByRole('button', { name: 'Gerar código' })).toBeInTheDocument()
    })

    it('codigo antigo que nao pode ser exibido: avisa e oferece revogar', async () => {
      vi.mocked(familyService.listInviteCodes).mockResolvedValue([code()])
      vi.mocked(familyService.getActiveInviteCode).mockRejectedValue(
        new ApiError({
          status: 409,
          code: 'INVITE_CODE_HIDDEN',
          message: 'Este código foi gerado antes e não pode ser exibido de novo. Revogue-o e gere outro.',
        }),
      )
      renderWithProviders(<SentInvitesPanel family={family} />)
      await userEvent.setup().click(await screen.findByRole('button', { name: 'Visualizar código' }))
      const dialog = await screen.findByRole('dialog', { name: 'Código de convite' })
      expect(await within(dialog).findByText(/não pode ser exibido de novo/)).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Revogar código' })).toBeInTheDocument()
    })

    it('ja existe codigo ativo (gerado em outra aba): mostra a mensagem do servidor', async () => {
      vi.mocked(familyService.issueInviteCode).mockRejectedValue(
        new ApiError({
          status: 409,
          code: 'INVITE_CODE_ACTIVE',
          message: 'Já existe um código ativo. Revogue-o para gerar outro.',
        }),
      )
      renderWithProviders(<SentInvitesPanel family={family} />)
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Gerar código' }))
      const dialog = await screen.findByRole('dialog')
      await user.click(within(dialog).getByRole('button', { name: 'Gerar código' }))
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(/já existe um código ativo/i)
    })
  })

  it('o card do convite pendente abre um menu com Reenviar e Revogar', async () => {
    renderWithProviders(<SentInvitesPanel family={family} />)
    const user = userEvent.setup()
    const card = await screen.findByRole('button', { name: /bruno@exemplo.com/ })
    expect(card).toHaveAttribute('aria-haspopup', 'menu')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reenviar/i })).not.toBeInTheDocument()

    await user.click(card)
    const menu = screen.getByRole('menu', { name: 'Ações do convite para bruno@exemplo.com' })
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((i) => i.textContent),
    ).toEqual(['Reenviar convite', 'Revogar convite'])
  })

  it('revogar descreve o efeito, confirma e chama a API', async () => {
    renderWithProviders(<SentInvitesPanel family={family} />)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /bruno@exemplo.com/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Revogar convite' }))
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText(/deixará de funcionar/i)).toBeInTheDocument()
    expect(familyService.revokeInvite).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: /revogar convite/i }))
    await waitFor(() => expect(familyService.revokeInvite).toHaveBeenCalledWith('f1', 'c1'))
    expect(await screen.findByText(/convite para bruno@exemplo.com revogado/i)).toBeInTheDocument()
  })

  it('cancelar a confirmacao nao revoga', async () => {
    renderWithProviders(<SentInvitesPanel family={family} />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /bruno@exemplo.com/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Revogar convite' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }))
    expect(familyService.revokeInvite).not.toHaveBeenCalled()
  })

  it('reenviar chama a API e informa que o link anterior foi invalidado', async () => {
    renderWithProviders(<SentInvitesPanel family={family} />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /bruno@exemplo.com/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Reenviar convite' }))

    await waitFor(() => expect(familyService.resendInvite).toHaveBeenCalledWith('f1', 'c1'))
    expect(await screen.findByText(/link anterior foi invalidado/i)).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('convites ja respondidos nao oferecem reenviar nem revogar', async () => {
    vi.mocked(familyService.listInvites).mockResolvedValue(page([invite({ situacao: 'ACEITO' })]))
    renderWithProviders(<SentInvitesPanel family={family} />)
    await screen.findByText('bruno@exemplo.com')

    expect(screen.queryByRole('button', { name: /bruno@exemplo.com/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
