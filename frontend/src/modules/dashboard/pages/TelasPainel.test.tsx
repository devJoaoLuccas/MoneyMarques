import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appRoutes } from '../../../app/router/app-routes'
import { createTestQueryClient } from '../../../test/render'
import { authService } from '../../auth/services/auth.service'
import type { SessionView } from '../../auth/types'
import { painelService } from '../services/painel.service'

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

const base = {
  periodoReferencia: '2026-10',
  visao: 'pessoal',
  atualizadoEm: '2026-10-17T15:00:00.000Z',
  moeda: 'BRL',
  indisponivel: false,
}

const fatura = (extra = {}) => ({
  uid: 'fa1',
  competencia: '2026-10',
  dataFechamento: '2026-10-05',
  dataVencimento: '2026-10-12',
  situacao: 'FECHADA',
  status: 'vencido',
  totalCentavos: '50000',
  saldoDevedorCentavos: '40000',
  ...extra,
})

const respostas: Record<string, unknown> = {
  'receitas-despesas': {
    ...base,
    atual: { receitasCentavos: '500000', despesasCentavos: '200000', resultadoCentavos: '300000' },
    anterior: { receitasCentavos: '400000', despesasCentavos: '100000', resultadoCentavos: '300000' },
    variacaoReceitasBp: 2500,
    variacaoDespesasBp: 10000,
    previsto: { receitasCentavos: '70000', despesasCentavos: '12300' },
    serie: [{ periodo: '2026-10', receitasCentavos: '500000', despesasCentavos: '200000' }],
    despesasPorCategoria: [{ categoriaUid: 'c1', nome: 'Mercado', valorCentavos: '200000', participacaoBp: 10000 }],
    receitasPorCategoria: [],
    maioresLancamentos: [
      { descricao: 'Aluguel', valorCentavos: '150000', data: '2026-10-05', origem: 'lancamento', categoria: 'Casa' },
      { descricao: 'TV', valorCentavos: '50000', data: '2026-10-02', origem: 'cartao', categoria: 'Lazer' },
    ],
    categoriaFiltrada: null,
  },
  cartoes: {
    ...base,
    cartoes: [
      {
        uid: 'k1',
        nome: 'Cartão Roxo',
        emissor: 'Banco X',
        bandeira: 'Visa',
        identificadorMascarado: '1234',
        situacao: 'ATIVO',
        limiteCentavos: '500000',
        utilizadoCentavos: '50000',
        disponivelCentavos: '450000',
        diaFechamento: 5,
        diaVencimento: 12,
        faturaAberta: fatura({ situacao: 'ABERTA', status: 'previsto' }),
        proximasFaturas: [fatura({ uid: 'fa2', competencia: '2026-11' })],
      },
    ],
    totais: { limiteCentavos: '500000', utilizadoCentavos: '50000', disponivelCentavos: '450000' },
  },
  patrimonio: {
    ...base,
    patrimonioBrutoCentavos: '300000',
    passivosCentavos: '40000',
    patrimonioLiquidoCentavos: '260000',
    contasCentavos: '100000',
    totalInvestidoCentavos: '200000',
    ultimaAtualizacaoInvestimentos: '2026-09-30',
    porInstituicao: [{ nome: 'Banco X', valorCentavos: '200000', participacaoBp: 10000 }],
    porClasse: [{ nome: 'Renda fixa', valorCentavos: '200000', participacaoBp: 10000 }],
    evolucaoAtivos: [{ periodo: '2026-10', ativosCentavos: '300000' }],
  },
  projecoes: {
    ...base,
    saldoInicialCentavos: '100000',
    meses: [
      {
        periodo: '2026-10',
        saldoInicialCentavos: '100000',
        entradasPrevistasCentavos: '0',
        saidasPrevistasCentavos: '30000',
        saldoFinalCentavos: '70000',
      },
      {
        periodo: '2026-11',
        saldoInicialCentavos: '70000',
        entradasPrevistasCentavos: '0',
        saidasPrevistasCentavos: '90000',
        saldoFinalCentavos: '-20000',
      },
      {
        periodo: '2026-12',
        saldoInicialCentavos: '-20000',
        entradasPrevistasCentavos: '0',
        saidasPrevistasCentavos: '0',
        saldoFinalCentavos: '-20000',
      },
      {
        periodo: '2027-01',
        saldoInicialCentavos: '-20000',
        entradasPrevistasCentavos: '0',
        saidasPrevistasCentavos: '0',
        saldoFinalCentavos: '-20000',
      },
    ],
    fluxoDiarioMesAtual: [
      { data: '2026-10-17', entradasPrevistasCentavos: '0', saidasPrevistasCentavos: '0', saldoCentavos: '100000' },
    ],
    menorSaldoMesAtual: {
      data: '2026-10-31',
      entradasPrevistasCentavos: '0',
      saidasPrevistasCentavos: '30000',
      saldoCentavos: '70000',
    },
    observacao: 'Previsto, não realizado.',
  },
  vencimentos: {
    ...base,
    truncado: false,
    itens: [
      {
        uid: 'l1',
        origem: 'lancamento',
        tipo: 'DESPESA',
        descricao: 'Aluguel atrasado',
        valorCentavos: '10000',
        competencia: '2026-09',
        vencimento: '2026-09-03',
        status: 'vencido',
      },
      {
        uid: 'l2',
        origem: 'lancamento',
        tipo: 'DESPESA',
        descricao: 'Internet',
        valorCentavos: '20000',
        competencia: '2026-10',
        vencimento: '2026-10-28',
        status: 'previsto',
      },
      {
        uid: 'fa1',
        origem: 'fatura',
        tipo: 'FATURA',
        descricao: 'Fatura Cartão Roxo',
        valorCentavos: '40000',
        competencia: '2026-10',
        vencimento: '2026-10-12',
        status: 'pago',
      },
    ],
  },
  alertas: {
    ...base,
    alertas: [
      { tipo: 'conta_vencida', gravidade: 'CRITICO', descricao: 'Aluguel atrasado (R$ 100,00) venceu em 03/09/2026.' },
    ],
  },
}

function renderApp(route: string) {
  window.localStorage.clear()
  const router = createMemoryRouter(appRoutes, { initialEntries: [route] })
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('telas do painel (DASH-002 a DASH-006)', () => {
  beforeEach(() => {
    vi.mocked(authService.getSession).mockResolvedValue(sessao)
    vi.mocked(painelService.obter).mockReset()
    vi.mocked(painelService.obter).mockImplementation(((_f: string, recurso: string) =>
      Promise.resolve(respostas[recurso])) as never)
  })

  describe('DASH-002: receitas e despesas', () => {
    it('mostra variacao com sinal, separa o previsto e lista as maiores despesas', async () => {
      renderApp('/painel/receitas-despesas?periodo=2026-10')
      expect(await screen.findByRole('heading', { level: 1, name: 'Receitas e despesas' })).toBeInTheDocument()
      const despesas = await screen.findByRole('article', { name: 'Despesas realizadas' })
      expect(within(despesas).getByText(/\+100,0% sobre Setembro de 2026/)).toBeInTheDocument()
      expect(screen.getByText(/Previsto, ainda não realizado/)).toBeInTheDocument()
      const maiores = screen.getByRole('region', { name: 'Maiores despesas do mês' })
      expect(within(maiores).getByText('Aluguel')).toBeInTheDocument()
      expect(within(maiores).getByText(/Cartão de crédito/)).toBeInTheDocument()
    })

    it('o filtro de categoria vai para a URL e refaz a consulta', async () => {
      const router = renderApp('/painel/receitas-despesas?periodo=2026-10')
      await screen.findByRole('article', { name: 'Despesas realizadas' })
      await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'c1')
      expect(router.state.location.search).toContain('categoria=c1')
    })

    it('ignora categoria invalida na URL (nao e enviada ao servidor)', async () => {
      renderApp('/painel/receitas-despesas?periodo=2026-10&categoria=<x>')
      await screen.findByRole('article', { name: 'Despesas realizadas' })
      expect(vi.mocked(painelService.obter).mock.calls[0][2].categoriaUid).toBeUndefined()
    })
  })

  describe('DASH-003: cartoes', () => {
    it('mostra limite total/comprometido/disponivel, mascara o numero e avisa que limite nao e saldo', async () => {
      renderApp('/painel/cartoes')
      const cartao = await screen.findByRole('article', { name: 'Cartão Roxo' })
      expect(within(cartao).getByText(/final 1234/)).toBeInTheDocument()
      expect(within(cartao).getByText('Limite comprometido')).toBeInTheDocument()
      expect(within(cartao).getByText(/não é saldo disponível/)).toBeInTheDocument()
      expect(within(cartao).getByText(/Fatura aberta/)).toBeInTheDocument()
      expect(within(cartao).getByText('Vencido')).toBeInTheDocument()
    })

    it('modo privacidade esconde os valores do cartao', async () => {
      renderApp('/painel/cartoes')
      await screen.findByRole('article', { name: 'Cartão Roxo' })
      await userEvent.click(screen.getByRole('button', { name: /ocultar valores/i }))
      expect(screen.queryByText(/5\.000,00/)).not.toBeInTheDocument()
    })

    it('sem cartoes: estado vazio', async () => {
      respostas.cartoes = { ...(respostas.cartoes as object), cartoes: [] }
      renderApp('/painel/cartoes')
      expect(await screen.findByText('Nenhum cartão nesta visão')).toBeInTheDocument()
    })
  })

  describe('DASH-004: patrimonio', () => {
    it('exibe a data da ultima atualizacao manual dos investimentos', async () => {
      renderApp('/painel/patrimonio')
      expect(await screen.findByText(/Última atualização: 30\/09\/2026/)).toBeInTheDocument()
      expect(screen.getByRole('article', { name: 'Patrimônio líquido' })).toBeInTheDocument()
      expect(screen.getByText('Renda fixa')).toBeInTheDocument()
    })

    it('sem ativos: estado vazio, sem zero inventado', async () => {
      respostas.patrimonio = {
        ...(respostas.patrimonio as object),
        patrimonioBrutoCentavos: null,
        patrimonioLiquidoCentavos: null,
      }
      renderApp('/painel/patrimonio')
      expect(await screen.findByText('Nenhum ativo nesta visão')).toBeInTheDocument()
    })
  })

  describe('DASH-005: projecoes', () => {
    it('sinaliza saldo negativo com texto, nao so com cor, e respeita o horizonte', async () => {
      const router = renderApp('/painel/projecoes')
      expect(await screen.findByText('Previsto, não realizado.')).toBeInTheDocument()
      expect(screen.getAllByText('Saldo negativo').length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: '12 meses' })).toHaveAttribute('aria-pressed', 'true')

      await userEvent.click(screen.getByRole('button', { name: '3 meses' }))
      expect(router.state.location.search).toContain('horizonte=3')
      const lista = screen.getByRole('region', { name: 'Mês a mês' })
      expect(within(lista).getAllByRole('listitem')).toHaveLength(3)

      await userEvent.click(screen.getByRole('button', { name: 'Mês atual' }))
      expect(within(screen.getByRole('region', { name: 'Mês a mês' })).getAllByRole('listitem')).toHaveLength(1)
    })

    it('mostra o menor saldo do fluxo diario', async () => {
      renderApp('/painel/projecoes')
      expect(await screen.findByText(/Menor saldo previsto:/)).toBeInTheDocument()
    })

    it('sem conta: estado vazio', async () => {
      respostas.projecoes = { ...(respostas.projecoes as object), saldoInicialCentavos: null, meses: [] }
      renderApp('/painel/projecoes')
      expect(await screen.findByText('Sem conta para projetar')).toBeInTheDocument()
    })
  })

  describe('DASH-006: vencimentos e alertas', () => {
    it('alerta tem gravidade em texto e compromissos tem status com rotulo', async () => {
      renderApp('/painel/vencimentos')
      const alertas = await screen.findByRole('list', { name: 'Alertas' })
      expect(within(alertas).getByText('Crítico.')).toBeInTheDocument()
      expect(await screen.findByText('Aluguel atrasado')).toBeInTheDocument()
      expect(screen.getByText('Vencido')).toBeInTheDocument()
      expect(screen.getByText('Previsto')).toBeInTheDocument()
      expect(screen.getByText('Pago')).toBeInTheDocument()
    })

    it('filtra por situacao e nao oferece "marcar como pago" no painel', async () => {
      renderApp('/painel/vencimentos')
      await screen.findByText('Aluguel atrasado')
      await userEvent.selectOptions(screen.getByLabelText('Situação'), 'pago')
      expect(screen.queryByText('Aluguel atrasado')).not.toBeInTheDocument()
      expect(screen.getByText('Fatura Cartão Roxo')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /marcar como pago/i })).not.toBeInTheDocument()
    })
  })

  it('erro de rede: oferece tentar novamente', async () => {
    vi.mocked(painelService.obter).mockRejectedValue(new Error('rede'))
    renderApp('/painel/cartoes')
    expect(await screen.findByText(/não foi possível carregar os cartões/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
  })
})
