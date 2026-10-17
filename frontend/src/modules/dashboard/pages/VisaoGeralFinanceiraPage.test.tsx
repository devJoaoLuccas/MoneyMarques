import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appRoutes } from '../../../app/router/app-routes'
import { ApiError } from '../../../shared/lib/api-error'
import { createTestQueryClient } from '../../../test/render'
import { authService } from '../../auth/services/auth.service'
import type { SessionView } from '../../auth/types'
import { painelService } from '../services/painel.service'
import type { IndicadorFinanceiro, ResumoFinanceiro } from '../types'

vi.mock('../../auth/services/auth.service', () => ({
  authService: { getSession: vi.fn(), logout: vi.fn() },
}))
vi.mock('../services/painel.service', () => ({ painelService: { obter: vi.fn() } }))

const sessao: SessionView = {
  status: 'authenticated',
  usuario: { uid: 'u1', nomeCompleto: 'Ana Maria', email: 'ana@exemplo.com' },
  mfaHabilitado: false,
  contexto: { tipo: 'unico', familias: [{ uid: 'f1', nome: 'Silva', papel: 'ADMINISTRADOR' }], convitesPendentes: [] },
}

const indicador = (valorCentavos: string | null, extra: Partial<IndicadorFinanceiro> = {}): IndicadorFinanceiro => ({
  valorCentavos,
  escopo: 'pessoal',
  referencia: { tipo: 'periodo', valor: '2026-10' },
  parcial: false,
  observacao: null,
  ...extra,
})

const resumo: ResumoFinanceiro = {
  periodoReferencia: '2026-10',
  visao: 'pessoal',
  atualizadoEm: '2026-10-17T12:00:00.000Z',
  moeda: 'BRL',
  indisponivel: false,
  semDados: false,
  indicadores: {
    patrimonioLiquido: indicador('130000', {
      parcial: true,
      observacao: 'Passivos (faturas em aberto) ainda não são descontados.',
    }),
    saldoDisponivelContas: indicador('130000'),
    receitasMes: indicador('50000'),
    despesasMes: indicador('20000'),
    saldoProjetadoMes: indicador(null, {
      observacao: 'A projeção só está disponível para o mês atual e meses futuros.',
    }),
  },
  taxaPoupancaBp: 6000,
  receitasDespesas: [{ periodo: '2026-10', receitasCentavos: '50000', despesasCentavos: '20000' }],
  despesasPorCategoria: [{ categoriaUid: 'c1', nome: 'Mercado', valorCentavos: '20000', participacaoBp: 10000 }],
}

function renderApp(route = '/painel?periodo=2026-10') {
  window.localStorage.clear()
  const router = createMemoryRouter(appRoutes, { initialEntries: [route] })
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('DASH-001: visao geral financeira', () => {
  beforeEach(() => {
    vi.mocked(authService.getSession).mockResolvedValue(sessao)
    vi.mocked(painelService.obter).mockReset()
  })

  it('mostra os KPIs com valor, escopo e referencia, e consulta com familia, visao e periodo', async () => {
    vi.mocked(painelService.obter).mockResolvedValue(resumo)
    renderApp()
    const saldo = await screen.findByRole('article', { name: 'Saldo disponível em contas' })
    expect(within(saldo).getByText(/R\$\s1\.300,00/)).toBeInTheDocument()
    expect(within(saldo).getByText('Pessoal')).toBeInTheDocument()
    expect(within(saldo).getByText('Outubro de 2026')).toBeInTheDocument()
    expect(painelService.obter).toHaveBeenCalledWith('f1', 'resumo', {
      visao: 'pessoal',
      periodo: '2026-10',
      categoriaUid: undefined,
    })
  })

  it('valor indisponivel nunca vira zero e indicador parcial explica o motivo', async () => {
    vi.mocked(painelService.obter).mockResolvedValue(resumo)
    renderApp()
    const projetado = await screen.findByRole('article', { name: 'Saldo projetado do mês' })
    expect(within(projetado).getByText('—')).toBeInTheDocument()
    expect(within(projetado).queryByText(/0,00/)).not.toBeInTheDocument()
    const patrimonio = screen.getByRole('article', { name: 'Patrimônio líquido' })
    expect(within(patrimonio).getByText(/Parcial\./)).toBeInTheDocument()
  })

  it('ocultar valores mascara cards, tabela e categorias', async () => {
    vi.mocked(painelService.obter).mockResolvedValue(resumo)
    renderApp()
    await screen.findByRole('article', { name: 'Saldo disponível em contas' })
    await userEvent.click(screen.getByRole('button', { name: /ocultar valores/i }))
    expect(screen.queryByText(/1\.300,00/)).not.toBeInTheDocument()
    expect(screen.queryByText(/200,00/)).not.toBeInTheDocument()
    expect(screen.queryByText(/500,00/)).not.toBeInTheDocument()
    expect(screen.getAllByText('R$ ••••').length).toBeGreaterThan(3)
    expect(screen.getByText('Valores ocultos.')).toBeInTheDocument()
  })

  it('trocar para a visao familiar consulta de novo com a nova visao', async () => {
    vi.mocked(painelService.obter).mockResolvedValue(resumo)
    const router = renderApp()
    await screen.findByRole('article', { name: 'Saldo disponível em contas' })
    await userEvent.click(screen.getByRole('button', { name: 'Familiar' }))
    expect(router.state.location.search).toContain('visao=familiar')
    await vi.waitFor(() =>
      expect(painelService.obter).toHaveBeenCalledWith('f1', 'resumo', {
        visao: 'familiar',
        periodo: '2026-10',
        categoriaUid: undefined,
      }),
    )
  })

  it('periodo invalido na URL cai no mes atual (a URL nao e confiada)', async () => {
    vi.mocked(painelService.obter).mockResolvedValue(resumo)
    renderApp('/painel?periodo=<script>&visao=todos')
    await screen.findByRole('article', { name: 'Saldo disponível em contas' })
    const [, , { visao, periodo }] = vi.mocked(painelService.obter).mock.calls[0]
    expect(visao).toBe('pessoal')
    expect(periodo).toMatch(/^\d{4}-\d{2}$/)
  })

  it('sem dados: estado vazio orientando o primeiro cadastro, sem numeros', async () => {
    vi.mocked(painelService.obter).mockResolvedValue({ ...resumo, semDados: true })
    renderApp()
    expect(await screen.findByText('Nenhum dado financeiro nesta visão')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('erro de rede oferece tentar novamente', async () => {
    vi.mocked(painelService.obter).mockRejectedValue(
      new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'sem rede' }),
    )
    renderApp()
    expect(await screen.findByText(/não foi possível carregar o painel/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
  })

  it('sem acesso mostra aviso neutro', async () => {
    vi.mocked(painelService.obter).mockRejectedValue(
      new ApiError({ status: 403, code: 'FORBIDDEN', message: 'negado' }),
    )
    renderApp()
    expect(await screen.findByText(/não tem acesso/i)).toBeInTheDocument()
  })
})
