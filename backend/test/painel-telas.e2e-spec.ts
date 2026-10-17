/* eslint-disable @typescript-eslint/no-unsafe-call -- corpos JSON das respostas, verificados campo a campo */
import {
  deslocarPeriodo,
  dataCivilLocal,
  periodoDoInstante,
  primeiroDiaCivil,
  ultimoDiaCivil,
} from '../src/modules/painel/domain/periodo';
import {
  ApiClient,
  createTestContext,
  registerAndVerify,
  resetDatabase,
  strongPassword,
  TestContext,
} from './support/test-app';

/**
 * RF-010 | Modulo 03, DASH-002 a DASH-006: receitas e despesas, cartoes,
 * patrimonio, projecoes, vencimentos e alertas. Banco real. Foco em
 * isolamento, regras de cartao (sem dupla contagem) e previsto x realizado.
 */
describe('Painel: demais telas (e2e)', () => {
  let ctx: TestContext;
  let seq = 0;

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    ctx.limiter.clearAll();
    ctx.mailbox.clear();
  });

  const agora = new Date();
  const periodoAtual = periodoDoInstante(agora);
  const proximoPeriodo = deslocarPeriodo(periodoAtual, 1);
  const mesAnterior = deslocarPeriodo(periodoAtual, -1);
  const hoje = dataCivilLocal(agora);
  const fimDoMes = ultimoDiaCivil(periodoAtual);
  const dia = (periodo: string, d: number) =>
    new Date(primeiroDiaCivil(periodo).getTime() + (d - 1) * 86_400_000);

  async function signup(email: string) {
    await registerAndVerify(ctx, email, { nome: 'Pessoa Teste' });
    ctx.limiter.clearAll();
    const api = new ApiClient(ctx.server);
    await api.post('/auth/login', { email, senha: strongPassword }).expect(200);
    return api;
  }
  const userUid = async (email: string) =>
    (
      await ctx.prisma.usuario.findUniqueOrThrow({
        where: { emailHmac: ctx.vault.hmac(email) },
      })
    ).uid;
  const createFamily = async (api: ApiClient) =>
    (
      (await api.post('/familias', { nome: 'Familia Silva' })).body as {
        uid: string;
      }
    ).uid;
  async function join(admin: ApiClient, familiaUid: string, email: string) {
    const invited = await signup(email);
    await admin
      .post(`/familias/${familiaUid}/convites`, { email, papel: 'INTEGRANTE' })
      .expect(201);
    await invited
      .post('/convites/aceitar', { token: ctx.mailbox.lastToken(email) })
      .expect(200);
    return invited;
  }

  const get = async <T>(
    api: ApiClient,
    familiaUid: string,
    rota: string,
    query = '',
  ): Promise<T> =>
    (
      await api
        .get(`/familias/${familiaUid}/painel/${rota}${query}`)
        .expect(200)
    ).body as T;

  const conta = (
    titularUid: string,
    familiaUid: string,
    saldo: bigint,
    visibilidade: 'PRIVADO' | 'COMPARTILHADO' = 'PRIVADO',
  ) =>
    ctx.prisma.contaFinanceira.create({
      data: {
        titularUid,
        familiaUid,
        nome: `Conta ${++seq}`,
        tipo: 'CORRENTE',
        saldoInicialCentavos: saldo,
        dataSaldoInicial: new Date('2026-01-01'),
        visibilidade,
      },
    });

  const cartao = (
    titularUid: string,
    familiaUid: string,
    limite: bigint,
    visibilidade: 'PRIVADO' | 'COMPARTILHADO' = 'PRIVADO',
  ) =>
    ctx.prisma.cartaoCredito.create({
      data: {
        titularUid,
        familiaUid,
        nome: `Cartao ${++seq}`,
        identificadorMascarado: '1234',
        limiteCentavos: limite,
        diaFechamento: 5,
        diaVencimento: 12,
        visibilidade,
      },
    });

  const fatura = (
    cartaoUid: string,
    periodo: string,
    situacao: 'ABERTA' | 'FECHADA' | 'PAGA',
    vencimento: Date,
  ) =>
    ctx.prisma.faturaCartao.create({
      data: {
        cartaoUid,
        competencia: primeiroDiaCivil(periodo),
        dataFechamento: dia(periodo, 5),
        dataVencimento: vencimento,
        situacao,
      },
    });

  async function compra(
    cartaoUid: string,
    criadoPorUid: string,
    faturaUid: string,
    valor: bigint,
    extra: {
      situacao?: 'ATIVA' | 'CANCELADA';
      escopo?: 'PESSOAL' | 'FAMILIAR';
      categoriaUid?: string;
    } = {},
  ) {
    const c = await ctx.prisma.compraCartao.create({
      data: {
        cartaoUid,
        criadoPorUid,
        descricao: `Compra ${++seq}`,
        valorTotalCentavos: valor,
        dataCompra: hoje,
        situacao: extra.situacao ?? 'ATIVA',
        escopoOrcamento: extra.escopo ?? 'PESSOAL',
        categoriaUid: extra.categoriaUid,
      },
    });
    await ctx.prisma.parcelaCompra.create({
      data: { compraUid: c.uid, faturaUid, numero: 1, valorCentavos: valor },
    });
    return c;
  }

  const lancamento = (o: {
    titularUid: string;
    familiaUid: string;
    tipo: 'RECEITA' | 'DESPESA';
    valor: bigint;
    vencimento: Date;
    situacao?: 'PREVISTO' | 'LIQUIDADO';
    descricao?: string;
    categoriaUid?: string;
  }) =>
    ctx.prisma.lancamentoFinanceiro.create({
      data: {
        titularUid: o.titularUid,
        criadoPorUid: o.titularUid,
        familiaUid: o.familiaUid,
        tipo: o.tipo,
        descricao: o.descricao ?? `Lancamento ${++seq}`,
        valorCentavos: o.valor,
        competencia: o.vencimento,
        vencimento: o.vencimento,
        situacao: o.situacao ?? 'PREVISTO',
        categoriaUid: o.categoriaUid,
      },
    });

  async function setup(email = 'ana@exemplo.com') {
    const api = await signup(email);
    const familiaUid = await createFamily(api);
    return { api, familiaUid, uid: await userUid(email) };
  }

  describe('acesso', () => {
    it.each([
      'receitas-despesas',
      'cartoes',
      'patrimonio',
      'projecoes',
      'vencimentos',
      'alertas',
    ])(
      '%s: exige vinculo (404 a estranhos), nao fica em cache e rejeita parametros invalidos',
      async (rota) => {
        const { api, familiaUid } = await setup();
        const estranho = await signup('estranho@exemplo.com');
        await estranho
          .get(`/familias/${familiaUid}/painel/${rota}`)
          .expect(404);
        const res = await api
          .get(`/familias/${familiaUid}/painel/${rota}`)
          .expect(200);
        expect(res.headers['cache-control']).toBe('no-store');
        await api
          .get(`/familias/${familiaUid}/painel/${rota}?periodo=2026-99`)
          .expect(400);
        await api
          .get(`/familias/${familiaUid}/painel/${rota}?categoriaUid=x`)
          .expect(400);
      },
    );
  });

  describe('DASH-003: cartoes e faturas', () => {
    it('limite utilizado = parcelas ativas em faturas nao pagas; fatura = parcelas - pagamentos', async () => {
      const { api, familiaUid, uid } = await setup();
      const c = await cartao(uid, familiaUid, 500_000n);
      const f = await fatura(
        c.uid,
        periodoAtual,
        'ABERTA',
        dia(proximoPeriodo, 12),
      );
      await compra(c.uid, uid, f.uid, 30_000n);
      await compra(c.uid, uid, f.uid, 20_000n);
      await compra(c.uid, uid, f.uid, 99_999n, { situacao: 'CANCELADA' });
      const conta1 = await conta(uid, familiaUid, 0n);
      const mov = await ctx.prisma.movimentacaoConta.create({
        data: {
          contaUid: conta1.uid,
          criadoPorUid: uid,
          tipo: 'PAGAMENTO_FATURA',
          valorCentavos: -10_000n,
          dataEfetivacao: agora,
          chaveIdempotencia: `m${++seq}`,
        },
      });
      await ctx.prisma.pagamentoFatura.create({
        data: {
          faturaUid: f.uid,
          movimentacaoUid: mov.uid,
          valorCentavos: 10_000n,
          pagoEm: agora,
          chaveIdempotencia: `p${++seq}`,
        },
      });

      const r = await get<any>(api, familiaUid, 'cartoes');
      expect(r.cartoes).toHaveLength(1);
      const [card] = r.cartoes;
      expect(card.limiteCentavos).toBe('500000');
      expect(card.utilizadoCentavos).toBe('50000');
      expect(card.disponivelCentavos).toBe('450000');
      expect(card.faturaAberta.totalCentavos).toBe('50000');
      expect(card.faturaAberta.saldoDevedorCentavos).toBe('40000');
      expect(card.identificadorMascarado).toBe('1234');
      expect(r.totais.disponivelCentavos).toBe('450000');
    });

    it('cartao privado de outro integrante nao aparece; compartilhado aparece na visao familiar', async () => {
      const { api: admin, familiaUid, uid } = await setup('admin@exemplo.com');
      const bia = await join(admin, familiaUid, 'bia@exemplo.com');
      const biaUid = await userUid('bia@exemplo.com');
      await cartao(biaUid, familiaUid, 100_000n, 'PRIVADO');
      await cartao(uid, familiaUid, 300_000n, 'COMPARTILHADO');

      expect(
        (await get<any>(admin, familiaUid, 'cartoes')).cartoes,
      ).toHaveLength(1);
      const familiarBia = await get<any>(
        bia,
        familiaUid,
        'cartoes',
        '?visao=familiar',
      );
      expect(familiarBia.cartoes.map((c: any) => c.limiteCentavos)).toEqual([
        '300000',
      ]);
      const adminFamiliar = await get<any>(
        admin,
        familiaUid,
        'cartoes',
        '?visao=familiar',
      );
      expect(adminFamiliar.cartoes.map((c: any) => c.limiteCentavos)).toEqual([
        '300000',
      ]);
    });
  });

  describe('despesa de cartao pela competencia da parcela (D-DASH-001)', () => {
    it('entra uma vez no mes da fatura; pagar a fatura nao conta de novo', async () => {
      const { api, familiaUid, uid } = await setup();
      const c = await cartao(uid, familiaUid, 500_000n);
      const f = await fatura(
        c.uid,
        periodoAtual,
        'FECHADA',
        dia(proximoPeriodo, 12),
      );
      await compra(c.uid, uid, f.uid, 25_000n);
      const futura = await fatura(
        c.uid,
        proximoPeriodo,
        'ABERTA',
        dia(deslocarPeriodo(periodoAtual, 2), 12),
      );
      await compra(c.uid, uid, futura.uid, 77_000n);
      const contaCorrente = await conta(uid, familiaUid, 100_000n);
      await ctx.prisma.movimentacaoConta.create({
        data: {
          contaUid: contaCorrente.uid,
          criadoPorUid: uid,
          tipo: 'PAGAMENTO_FATURA',
          valorCentavos: -25_000n,
          dataEfetivacao: agora,
          chaveIdempotencia: `m${++seq}`,
        },
      });

      const resumo = await get<any>(api, familiaUid, 'resumo');
      expect(resumo.indicadores.despesasMes.valorCentavos).toBe('25000');
      expect(resumo.indicadores.saldoDisponivelContas.valorCentavos).toBe(
        '75000',
      );

      const rd = await get<any>(api, familiaUid, 'receitas-despesas');
      expect(rd.atual.despesasCentavos).toBe('25000');
      expect(rd.maioresLancamentos[0]).toMatchObject({
        origem: 'cartao',
        valorCentavos: '25000',
      });
      const proximo = await get<any>(
        api,
        familiaUid,
        'receitas-despesas',
        `?periodo=${proximoPeriodo}`,
      );
      expect(proximo.atual.despesasCentavos).toBe('77000');
    });

    it('compra familiar nao soma na visao pessoal', async () => {
      const { api, familiaUid, uid } = await setup();
      const c = await cartao(uid, familiaUid, 500_000n, 'COMPARTILHADO');
      const f = await fatura(
        c.uid,
        periodoAtual,
        'ABERTA',
        dia(proximoPeriodo, 12),
      );
      await compra(c.uid, uid, f.uid, 40_000n, { escopo: 'FAMILIAR' });
      expect(
        (await get<any>(api, familiaUid, 'resumo')).indicadores.despesasMes
          .valorCentavos,
      ).toBe('0');
      expect(
        (await get<any>(api, familiaUid, 'resumo', '?visao=familiar'))
          .indicadores.despesasMes.valorCentavos,
      ).toBe('40000');
    });
  });

  describe('DASH-002: receitas e despesas', () => {
    it('compara com o mes anterior, separa previsto e filtra por categoria', async () => {
      const { api, familiaUid, uid } = await setup();
      const cc = await conta(uid, familiaUid, 0n);
      const mercado = await ctx.prisma.categoriaFinanceira.create({
        data: { titularUid: uid, tipo: 'DESPESA', nome: 'Mercado' },
      });
      const lazer = await ctx.prisma.categoriaFinanceira.create({
        data: { titularUid: uid, tipo: 'DESPESA', nome: 'Lazer' },
      });
      const liquidar = async (
        valor: bigint,
        quando: Date,
        categoriaUid?: string,
      ) => {
        const l = await lancamento({
          titularUid: uid,
          familiaUid,
          tipo: 'DESPESA',
          valor,
          vencimento: dataCivilLocal(quando),
          situacao: 'LIQUIDADO',
          categoriaUid,
        });
        const m = await ctx.prisma.movimentacaoConta.create({
          data: {
            contaUid: cc.uid,
            criadoPorUid: uid,
            tipo: 'PAGAMENTO',
            valorCentavos: -valor,
            dataEfetivacao: quando,
            chaveIdempotencia: `m${++seq}`,
          },
        });
        await ctx.prisma.liquidacaoLancamento.create({
          data: {
            lancamentoUid: l.uid,
            movimentacaoUid: m.uid,
            valorCentavos: valor,
            liquidadoEm: quando,
          },
        });
      };
      await liquidar(60_000n, agora, mercado.uid);
      await liquidar(40_000n, agora, lazer.uid);
      await liquidar(
        50_000n,
        new Date(agora.getTime() - 35 * 86_400_000),
        mercado.uid,
      );
      await lancamento({
        titularUid: uid,
        familiaUid,
        tipo: 'DESPESA',
        valor: 15_000n,
        vencimento: fimDoMes,
        categoriaUid: mercado.uid,
      });

      const r = await get<any>(api, familiaUid, 'receitas-despesas');
      expect(r.atual.despesasCentavos).toBe('100000');
      expect(r.anterior.despesasCentavos).toBe('50000');
      expect(r.variacaoDespesasBp).toBe(10_000);
      expect(r.variacaoReceitasBp).toBeNull();
      expect(r.previsto.despesasCentavos).toBe('15000');
      expect(r.atual.resultadoCentavos).toBe('-100000');
      expect(r.maioresLancamentos[0].valorCentavos).toBe('60000');

      const f = await get<any>(
        api,
        familiaUid,
        'receitas-despesas',
        `?categoriaUid=${lazer.uid}`,
      );
      expect(f.atual.despesasCentavos).toBe('40000');
      expect(f.previsto.despesasCentavos).toBe('0');
      expect(f.despesasPorCategoria).toHaveLength(2);
      expect(f.categoriaFiltrada).toBe(lazer.uid);
      expect(mesAnterior).not.toBe(periodoAtual);
    });
  });

  describe('DASH-004: patrimonio', () => {
    it('liquido = contas + investimentos - faturas nao quitadas; mostra a data da ultima atualizacao manual', async () => {
      const { api: admin, familiaUid, uid } = await setup('admin@exemplo.com');
      const bia = await join(admin, familiaUid, 'bia@exemplo.com');
      const biaUid = await userUid('bia@exemplo.com');
      await conta(uid, familiaUid, 100_000n);
      const inst = await ctx.prisma.instituicaoFinanceira.create({
        data: { nome: 'Banco X' },
      });
      const renda = await ctx.prisma.classeAtivo.create({
        data: { nome: 'Renda fixa' },
      });
      const posicao = await ctx.prisma.posicaoInvestimento.create({
        data: {
          titularUid: uid,
          familiaUid,
          instituicaoUid: inst.uid,
          classeUid: renda.uid,
          descricao: 'CDB',
          valorReferenciaCentavos: 200_000n,
          dataReferencia: new Date('2026-09-30'),
        },
      });
      await ctx.prisma.historicoValorPosicao.create({
        data: {
          posicaoUid: posicao.uid,
          valorCentavos: 200_000n,
          dataReferencia: new Date('2026-09-30'),
        },
      });
      await ctx.prisma.posicaoInvestimento.create({
        data: {
          titularUid: biaUid,
          familiaUid,
          instituicaoUid: inst.uid,
          classeUid: renda.uid,
          descricao: 'Secreto',
          valorReferenciaCentavos: 999_000n,
          dataReferencia: new Date('2026-10-01'),
        },
      });
      const c = await cartao(uid, familiaUid, 500_000n);
      const f = await fatura(
        c.uid,
        periodoAtual,
        'FECHADA',
        dia(proximoPeriodo, 12),
      );
      await compra(c.uid, uid, f.uid, 40_000n);

      const r = await get<any>(admin, familiaUid, 'patrimonio');
      expect(r.patrimonioBrutoCentavos).toBe('300000');
      expect(r.passivosCentavos).toBe('40000');
      expect(r.patrimonioLiquidoCentavos).toBe('260000');
      expect(r.totalInvestidoCentavos).toBe('200000');
      expect(r.ultimaAtualizacaoInvestimentos).toBe('2026-09-30');
      expect(r.porClasse).toEqual([
        { nome: 'Renda fixa', valorCentavos: '200000', participacaoBp: 10_000 },
      ]);
      expect(JSON.stringify(r)).not.toContain('999000');
      expect(r.evolucaoAtivos.at(-1)).toEqual({
        periodo: periodoAtual,
        ativosCentavos: '300000',
      });

      const daBia = await get<any>(bia, familiaUid, 'patrimonio');
      expect(daBia.totalInvestidoCentavos).toBe('999000');
    });

    it('sem recursos: tudo indisponivel, nunca zero inventado', async () => {
      const { api, familiaUid } = await setup();
      const r = await get<any>(api, familiaUid, 'patrimonio');
      expect(r.patrimonioLiquidoCentavos).toBeNull();
      expect(r.totalInvestidoCentavos).toBeNull();
      expect(r.ultimaAtualizacaoInvestimentos).toBeNull();
    });
  });

  describe('DASH-005: projecoes', () => {
    it('encadeia os meses com lancamentos e faturas previstos', async () => {
      const { api, familiaUid, uid } = await setup();
      await conta(uid, familiaUid, 100_000n);
      await lancamento({
        titularUid: uid,
        familiaUid,
        tipo: 'DESPESA',
        valor: 30_000n,
        vencimento: fimDoMes,
      });
      await lancamento({
        titularUid: uid,
        familiaUid,
        tipo: 'RECEITA',
        valor: 500_000n,
        vencimento: dia(proximoPeriodo, 20),
      });
      const c = await cartao(uid, familiaUid, 500_000n);
      const f = await fatura(
        c.uid,
        periodoAtual,
        'FECHADA',
        dia(proximoPeriodo, 10),
      );
      await compra(c.uid, uid, f.uid, 40_000n);

      const r = await get<any>(api, familiaUid, 'projecoes');
      expect(r.saldoInicialCentavos).toBe('100000');
      expect(r.meses).toHaveLength(12);
      expect(r.meses[0]).toMatchObject({
        periodo: periodoAtual,
        saldoFinalCentavos: '70000',
      });
      expect(r.meses[1]).toMatchObject({
        periodo: proximoPeriodo,
        saldoInicialCentavos: '70000',
        saldoFinalCentavos: '530000',
      });
      expect(r.fluxoDiarioMesAtual.at(-1).saldoCentavos).toBe('70000');
      expect(r.menorSaldoMesAtual.saldoCentavos).toBe('70000');
      expect(r.observacao).toMatch(/previsto/i);
    });

    it('sem conta autorizada nao ha saldo inicial nem projecao', async () => {
      const { api, familiaUid } = await setup();
      const r = await get<any>(api, familiaUid, 'projecoes');
      expect(r.saldoInicialCentavos).toBeNull();
      expect(r.meses).toEqual([]);
    });
  });

  describe('DASH-006: vencimentos e alertas', () => {
    it('ordena por vencimento, marca vencidos de meses anteriores e mostra pagos do periodo', async () => {
      const { api, familiaUid, uid } = await setup();
      await conta(uid, familiaUid, 0n);
      await lancamento({
        titularUid: uid,
        familiaUid,
        tipo: 'DESPESA',
        valor: 10_000n,
        vencimento: dia(mesAnterior, 3),
        descricao: 'Aluguel atrasado',
      });
      await lancamento({
        titularUid: uid,
        familiaUid,
        tipo: 'DESPESA',
        valor: 20_000n,
        vencimento: fimDoMes,
        descricao: 'Internet',
      });
      await lancamento({
        titularUid: uid,
        familiaUid,
        tipo: 'DESPESA',
        valor: 5_000n,
        vencimento: dia(periodoAtual, 1),
        situacao: 'LIQUIDADO',
        descricao: 'Pago',
      });
      const c = await cartao(uid, familiaUid, 500_000n);
      const f = await fatura(
        c.uid,
        mesAnterior,
        'FECHADA',
        dia(periodoAtual, 1),
      );
      await compra(c.uid, uid, f.uid, 33_000n);

      const r = await get<any>(api, familiaUid, 'vencimentos');
      const por = Object.fromEntries(r.itens.map((i: any) => [i.descricao, i]));
      expect(por['Aluguel atrasado'].status).toBe('vencido');
      expect(por['Internet'].status).toMatch(/previsto|pendente/);
      expect(por['Pago'].status).toBe('pago');
      expect(
        r.itens.some(
          (i: any) => i.origem === 'fatura' && i.valorCentavos === '33000',
        ),
      ).toBe(true);
      const datas = r.itens.map((i: any) => i.vencimento);
      expect([...datas].sort()).toEqual(datas);
      expect(r.truncado).toBe(false);
    });

    it('nao lista compromissos de outro integrante', async () => {
      const { api: admin, familiaUid } = await setup('admin@exemplo.com');
      await join(admin, familiaUid, 'bia@exemplo.com');
      const biaUid = await userUid('bia@exemplo.com');
      await lancamento({
        titularUid: biaUid,
        familiaUid,
        tipo: 'DESPESA',
        valor: 1_000n,
        vencimento: fimDoMes,
        descricao: 'Segredo da Bia',
      });
      const r = await get<any>(admin, familiaUid, 'vencimentos');
      expect(JSON.stringify(r)).not.toContain('Segredo');
    });

    it('alertas: conta vencida, projecao negativa e orcamento excedido; respeita preferencias', async () => {
      const { api, familiaUid, uid } = await setup();
      const cc = await conta(uid, familiaUid, 10_000n);
      await lancamento({
        titularUid: uid,
        familiaUid,
        tipo: 'DESPESA',
        valor: 50_000n,
        vencimento: dia(mesAnterior, 1),
        descricao: 'Luz',
      });
      const cat = await ctx.prisma.categoriaFinanceira.create({
        data: { titularUid: uid, tipo: 'DESPESA', nome: 'Mercado' },
      });
      const l = await lancamento({
        titularUid: uid,
        familiaUid,
        tipo: 'DESPESA',
        valor: 30_000n,
        vencimento: dataCivilLocal(agora),
        situacao: 'LIQUIDADO',
        categoriaUid: cat.uid,
      });
      const m = await ctx.prisma.movimentacaoConta.create({
        data: {
          contaUid: cc.uid,
          criadoPorUid: uid,
          tipo: 'PAGAMENTO',
          valorCentavos: -30_000n,
          dataEfetivacao: agora,
          chaveIdempotencia: `m${++seq}`,
        },
      });
      await ctx.prisma.liquidacaoLancamento.create({
        data: {
          lancamentoUid: l.uid,
          movimentacaoUid: m.uid,
          valorCentavos: 30_000n,
          liquidadoEm: agora,
        },
      });
      await ctx.prisma.orcamentoCategoria.create({
        data: {
          titularUid: uid,
          categoriaUid: cat.uid,
          escopo: 'PESSOAL',
          escopoUid: uid,
          competencia: primeiroDiaCivil(periodoAtual),
          limiteCentavos: 20_000n,
        },
      });

      const r = await get<any>(api, familiaUid, 'alertas');
      const tipos = r.alertas.map((a: any) => a.tipo);
      expect(tipos).toEqual(
        expect.arrayContaining([
          'conta_vencida',
          'projecao_negativa',
          'orcamento_excedido',
        ]),
      );
      expect(
        r.alertas.find((a: any) => a.tipo === 'conta_vencida').gravidade,
      ).toBe('CRITICO');

      await ctx.prisma.preferenciaAlerta.create({
        data: { usuarioUid: uid, tipo: 'orcamento_excedido', ativo: false },
      });
      const depois = await get<any>(api, familiaUid, 'alertas');
      expect(depois.alertas.map((a: any) => a.tipo)).not.toContain(
        'orcamento_excedido',
      );
    });

    it('orcamento familiar de outro integrante so aparece com concessao', async () => {
      const { api: admin, familiaUid, uid } = await setup('admin@exemplo.com');
      const bia = await join(admin, familiaUid, 'bia@exemplo.com');
      const biaUid = await userUid('bia@exemplo.com');
      const casa = await conta(uid, familiaUid, 1_000_000n, 'COMPARTILHADO');
      const cat = await ctx.prisma.categoriaFinanceira.create({
        data: {
          titularUid: uid,
          familiaUid,
          tipo: 'DESPESA',
          nome: 'Casa',
          visibilidade: 'COMPARTILHADO',
        },
      });
      const l = await ctx.prisma.lancamentoFinanceiro.create({
        data: {
          titularUid: uid,
          criadoPorUid: uid,
          familiaUid,
          tipo: 'DESPESA',
          descricao: 'Reforma',
          valorCentavos: 90_000n,
          competencia: dataCivilLocal(agora),
          vencimento: dataCivilLocal(agora),
          situacao: 'LIQUIDADO',
          visibilidade: 'COMPARTILHADO',
          escopoOrcamento: 'FAMILIAR',
          categoriaUid: cat.uid,
        },
      });
      const m = await ctx.prisma.movimentacaoConta.create({
        data: {
          contaUid: casa.uid,
          criadoPorUid: uid,
          tipo: 'PAGAMENTO',
          valorCentavos: -90_000n,
          dataEfetivacao: agora,
          chaveIdempotencia: `m${++seq}`,
        },
      });
      await ctx.prisma.liquidacaoLancamento.create({
        data: {
          lancamentoUid: l.uid,
          movimentacaoUid: m.uid,
          valorCentavos: 90_000n,
          liquidadoEm: agora,
        },
      });
      const orc = await ctx.prisma.orcamentoCategoria.create({
        data: {
          titularUid: uid,
          familiaUid,
          categoriaUid: cat.uid,
          escopo: 'FAMILIAR',
          escopoUid: familiaUid,
          competencia: primeiroDiaCivil(periodoAtual),
          limiteCentavos: 50_000n,
        },
      });

      const tipos = async (api: ApiClient) =>
        (
          await get<any>(api, familiaUid, 'alertas', '?visao=familiar')
        ).alertas.map((a: any) => a.tipo);
      expect(await tipos(admin)).toContain('orcamento_excedido');
      expect(await tipos(bia)).not.toContain('orcamento_excedido');
      await ctx.prisma.permissaoRecursoFamilia.create({
        data: {
          familiaUid,
          usuarioUid: biaUid,
          concedidoPorUid: uid,
          tipoRecurso: 'ORCAMENTO',
          recursoUid: orc.uid,
        },
      });
      expect(await tipos(bia)).toContain('orcamento_excedido');
    });
  });
});
