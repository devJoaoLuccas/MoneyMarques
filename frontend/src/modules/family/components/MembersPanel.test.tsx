import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/api-error'
import { renderWithProviders } from '../../../test/render'
import type { ActiveFamily } from '../hooks/useFamily'
import { familyService } from '../services/family.service'
import type { Member, Page } from '../types'
import { MembersPanel } from './MembersPanel'

vi.mock('../services/family.service', () => ({
  familyService: { listMembers: vi.fn(), changeRole: vi.fn(), removeMember: vi.fn() },
}))

const member = (over: Partial<Member>): Member => ({
  uid: 'm1',
  nome: 'Ana Admin',
  email: 'ana@exemplo.com',
  papel: 'ADMINISTRADOR',
  situacao: 'ATIVO',
  ingressouEm: '2026-10-01T12:00:00.000Z',
  removidoEm: null,
  voce: true,
  ...over,
})

const page = (itens: Member[], over: Partial<Page<Member>> = {}): Page<Member> => ({
  itens,
  pagina: 1,
  tamanho: 10,
  total: itens.length,
  ...over,
})

const admin: ActiveFamily = { uid: 'f1', nome: 'Silva', papel: 'ADMINISTRADOR' }
const viewer: ActiveFamily = { uid: 'f1', nome: 'Silva', papel: 'VISUALIZADOR' }

const bruno = member({ uid: 'm2', nome: 'Bruno Souza', email: 'bruno@exemplo.com', papel: 'INTEGRANTE', voce: false })

describe('MembersPanel (FAM-003)', () => {
  beforeEach(() => {
    vi.mocked(familyService.listMembers)
      .mockReset()
      .mockResolvedValue(page([member({}), bruno]))
    vi.mocked(familyService.changeRole).mockReset().mockResolvedValue(undefined)
    vi.mocked(familyService.removeMember).mockReset().mockResolvedValue(undefined)
  })

  it('lista integrantes com papel e data de ingresso (DD/MM/AAAA)', async () => {
    renderWithProviders(<MembersPanel family={admin} />)
    expect(await screen.findByText('Bruno Souza')).toBeInTheDocument()
    expect(screen.getByText('Você')).toBeInTheDocument()
    expect(screen.getAllByText(/desde 01\/10\/2026/i)).toHaveLength(2)
    expect(screen.getByText('bruno@exemplo.com')).toBeInTheDocument()
  })

  it('CA-FAM-007: nao administrador nao ve controles administrativos nem filtro de removidos', async () => {
    renderWithProviders(<MembersPanel family={viewer} />)
    await screen.findByText('Bruno Souza')

    expect(screen.queryByRole('button', { name: /bruno souza/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Situação')).not.toBeInTheDocument()
    expect(familyService.listMembers).toHaveBeenCalledWith(
      'f1',
      expect.objectContaining({ pagina: 1, situacao: undefined }),
    )
  })

  it('estado vazio explica como seguir', async () => {
    vi.mocked(familyService.listMembers).mockResolvedValue(page([]))
    renderWithProviders(<MembersPanel family={admin} />)
    expect(await screen.findByText('Nenhum integrante encontrado')).toBeInTheDocument()
  })

  it('erro de carregamento permite tentar novamente', async () => {
    vi.mocked(familyService.listMembers)
      .mockRejectedValueOnce(new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Sem conexão.' }))
      .mockResolvedValue(page([bruno]))
    renderWithProviders(<MembersPanel family={admin} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão.')
    await userEvent.setup().click(screen.getByRole('button', { name: /tentar novamente/i }))
    expect(await screen.findByText('Bruno Souza')).toBeInTheDocument()
  })

  it('Editar cargo abre um modal com as tres opcoes e o cargo atual marcado', async () => {
    renderWithProviders(<MembersPanel family={admin} />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /bruno souza/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Editar cargo' }))

    const dialog = await screen.findByRole('dialog', { name: 'Editar cargo' })
    expect(
      within(dialog)
        .getAllByRole('radio')
        .map((r) => (r as HTMLInputElement).value),
    ).toEqual(['ADMINISTRADOR', 'INTEGRANTE', 'VISUALIZADOR'])
    expect(within(dialog).getByRole('radio', { name: /integrante/i })).toBeChecked()
    expect(within(dialog).getByText('Atual')).toBeInTheDocument()
    // Sem mudanca nao ha o que salvar.
    expect(within(dialog).getByRole('button', { name: 'Salvar cargo' })).toBeDisabled()
  })

  it('escolher outro cargo mostra o efeito e salva so ao confirmar', async () => {
    renderWithProviders(<MembersPanel family={admin} />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /bruno souza/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Editar cargo' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar cargo' })

    await user.click(within(dialog).getByRole('radio', { name: /administrador/i }))
    expect(within(dialog).getByText(/Bruno Souza passará de Integrante para Administrador/)).toBeInTheDocument()
    expect(familyService.changeRole).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Salvar cargo' }))
    await waitFor(() => expect(familyService.changeRole).toHaveBeenCalledWith('f1', 'm2', 'ADMINISTRADOR'))
    expect(await screen.findByText(/cargo de bruno souza atualizado para administrador/i)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cancelar nao altera nada', async () => {
    renderWithProviders(<MembersPanel family={admin} />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /bruno souza/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Editar cargo' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar cargo' })
    await user.click(within(dialog).getByRole('radio', { name: /visualizador/i }))
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(familyService.changeRole).not.toHaveBeenCalled()
  })

  it('erro do servidor (ultimo administrador) aparece no modal, que continua aberto', async () => {
    vi.mocked(familyService.changeRole).mockRejectedValue(
      new ApiError({
        status: 409,
        code: 'LAST_ADMIN_REQUIRED',
        message: 'A família precisa de pelo menos um administrador ativo.',
      }),
    )
    renderWithProviders(<MembersPanel family={admin} />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /ana admin/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Editar cargo' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar cargo' })
    await user.click(within(dialog).getByRole('radio', { name: /visualizador/i }))
    await user.click(within(dialog).getByRole('button', { name: 'Salvar cargo' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/pelo menos um administrador ativo/i)
    expect(screen.getByRole('dialog', { name: 'Editar cargo' })).toBeInTheDocument()
  })

  it('CA-FAM-011: remover descreve o efeito, confirma e chama a API', async () => {
    renderWithProviders(<MembersPanel family={admin} />)
    const user = userEvent.setup()
    await screen.findByText('Bruno Souza')

    await user.click(screen.getByRole('button', { name: /bruno souza/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Remover da família' }))
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText(/perderá o acesso à família imediatamente/i)).toBeInTheDocument()
    expect(familyService.removeMember).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: /remover da família/i }))
    await waitFor(() => expect(familyService.removeMember).toHaveBeenCalledWith('f1', 'm2'))
    expect(await screen.findByText(/bruno souza foi removido/i)).toBeInTheDocument()
  })

  it('CA-FAM-010: erro do ultimo administrador e mostrado ao usuario', async () => {
    vi.mocked(familyService.removeMember).mockRejectedValue(
      new ApiError({
        status: 409,
        code: 'LAST_ADMIN_REQUIRED',
        message: 'A família precisa de pelo menos um administrador ativo.',
      }),
    )
    renderWithProviders(<MembersPanel family={admin} />)
    const user = userEvent.setup()
    await screen.findByText('Bruno Souza')

    await user.click(screen.getByRole('button', { name: /ana admin/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Remover da família' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /remover da família/i }))

    expect(await screen.findByText(/pelo menos um administrador ativo/i)).toBeInTheDocument()
  })

  it('removidos nao tem acoes e a data de remocao e exibida', async () => {
    vi.mocked(familyService.listMembers).mockResolvedValue(
      page([
        member({
          uid: 'm3',
          nome: 'Carla Lima',
          voce: false,
          situacao: 'REMOVIDO',
          removidoEm: '2026-10-10T12:00:00.000Z',
        }),
      ]),
    )
    renderWithProviders(<MembersPanel family={admin} />)
    await userEvent.setup().selectOptions(screen.getByLabelText('Situação'), 'REMOVIDO')

    expect(await screen.findByText(/removido em 10\/10\/2026/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /carla lima/i })).not.toBeInTheDocument()
  })

  it('o card do integrante abre um menu com Editar cargo e Remover da familia', async () => {
    renderWithProviders(<MembersPanel family={admin} />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /bruno souza/i }))
    const menu = screen.getByRole('menu', { name: 'Ações para Bruno Souza' })
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((i) => i.textContent),
    ).toEqual(['Editar cargo', 'Remover da família'])
  })

  it('paginacao: avanca para a proxima pagina', async () => {
    vi.mocked(familyService.listMembers).mockResolvedValue(page([bruno], { total: 25 }))
    renderWithProviders(<MembersPanel family={admin} />)
    const user = userEvent.setup()

    expect(await screen.findByText(/página 1 de 3/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /próxima/i }))
    await waitFor(() =>
      expect(familyService.listMembers).toHaveBeenLastCalledWith('f1', expect.objectContaining({ pagina: 2 })),
    )
  })

  it('filtro por papel volta para a primeira pagina e consulta o servidor', async () => {
    renderWithProviders(<MembersPanel family={admin} />)
    await screen.findByText('Bruno Souza')
    await userEvent.setup().selectOptions(screen.getByLabelText('Papel'), 'VISUALIZADOR')

    await waitFor(() =>
      expect(familyService.listMembers).toHaveBeenLastCalledWith(
        'f1',
        expect.objectContaining({ pagina: 1, papel: 'VISUALIZADOR' }),
      ),
    )
  })
})
