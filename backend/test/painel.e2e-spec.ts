import {
  dataCivilLocal,
  deslocarPeriodo,
  periodoDoInstante,
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
 * RF-010 | Modulo 03 (Dashboard Financeiro), DASH-001: resumo financeiro.
 * Foco: formulas, regras de contagem e isolamento entre usuarios/familias
 * (CA-DASH-024, CA-DASH-026). Banco real.
 */
interface Indicador {
  valorCentavos: string | null;
  parcial: boolean;
  observacao: string | null;
}
interface Resumo {
  semDados: boolean;
  periodoReferencia: string;
  visao: string;
  indicadores: Record<
    | 'patrimonioLiquido'
    | 'saldoDisponivelContas'
    | 'receitasMes'
    | 'despesasMes'
    | 'saldoProjetadoMes',
    Indicador
  >;
  taxaPoupancaBp: number | null;
  receitasDespesas: {
    periodo: string;
    receitasCentavos: string;
    despesasCentavos: string;
  }[];
  despesasPorCategoria: {
    nome: string;
    valorCentavos: string;
    participacaoBp: number;
  }[];
}

describe('Painel: resumo financeiro (e2e)', () => {
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
  const mesAnterior = deslocarPeriodo(periodoAtual, -1);
  const fimDoMes = ultimoDiaCivil(periodoAtual);
  const umMesAtras = new Date(agora.getTime() - 35 * 24 * 60 * 60 * 1000);

  async function signup(email: string, nome = 'Pessoa Teste') {
    await registerAndVerify(ctx, email, { nome });
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

  async function createFamily(api: ApiClient) {
    const res = await api.post('/familias', { nome: 'Familia Silva' });
    return (res.body as { uid: string }).uid;
  }

  async function join(
    admin: ApiClient,
    familiaUid: string,
    email: string,
    papel: 'ADMINISTRADOR' | 'INTEGRANTE' | 'VISUALIZADOR' = 'INTEGRANTE',
  ) {
    const invited = await signup(email, `Convidado ${email.split('@')[0]}`);
    await admin
      .post(`/familias/${familiaUid}/convites`, { email, papel })
      .expect(201);
    await invited
      .post('/convites/aceitar', { token: ctx.mailbox.lastToken(email) })
      .expect(200);
    return invited;
  }

  const resumo = async (
    api: ApiClient,
    familiaUid: string,
    query = '',
  ): Promise<Resumo> =>
    (await api.get(`/familias/${familiaUid}/painel/resumo${query}`).expect(200))
      .body as Resumo;

  async function criarConta(
    titularUid: string,
    familiaUid: string | null,
    visibilidade: 'PRIVADO' | 'COMPARTILHADO' | 'RESTRITO',
    saldoInicialCentavos: bigint,
  ) {
    return ctx.prisma.contaFinanceira.create({
      data: {
        titularUid,
        familiaUid,
        nome: `Conta ${++seq}`,
        tipo: 'CORRENTE',
        saldoInicialCentavos,
        dataSaldoInicial: new Date('2026-01-01'),
        visibilidade,
      },
    });
  }

  async function movimentar(
    contaUid: string,
    criadoPorUid: string,
    tipo:
      | 'RECEBIMENTO'
      | 'PAGAMENTO'
      | 'TRANSFERENCIA_ENTRADA'
      | 'APORTE_INVESTIMENTO',
    valorCentavos: bigint,
    dataEfetivacao = agora,
  ) {
    return ctx.prisma.movimentacaoConta.create({
      data: {
        contaUid,
        criadoPorUid,
        tipo,
        valorCentavos,
        dataEfetivacao,
        chaveIdempotencia: `mov-${++seq}`,
      },
    });
  }

  interface LancamentoOpcoes {
    titularUid: string;
    familiaUid?: string | null;
    tipo: 'RECEITA' | 'DESPESA';
    valorCentavos: bigint;
    visibilidade?: 'PRIVADO' | 'COMPARTILHADO';
    escopo?: 'PESSOAL' | 'FAMILIAR';
    categoriaUid?: string;
    situacao?: 'PREVISTO' | 'LIQUIDADO' | 'PARCIALMENTE_LIQUIDADO';
  }

  function criarLancamento(o: LancamentoOpcoes) {
    return ctx.prisma.lancamentoFinanceiro.create({
      data: {
        titularUid: o.titularUid,
        criadoPorUid: o.titularUid,
        familiaUid: o.familiaUid ?? null,
        categoriaUid: o.categoriaUid,
        tipo: o.tipo,
        descricao: `Lancamento ${++seq}`,
        valorCentavos: o.valorCentavos,
        competencia: dataCivilLocal(agora),
        vencimento: fimDoMes,
        situacao: o.situacao ?? 'PREVISTO',
        visibilidade: o.visibilidade ?? 'PRIVADO',
        escopoOrcamento: o.escopo ?? 'PESSOAL',
      },
    });
  }

  /** Lancamento liquidado: cria a movimentacao (livro-caixa) e a liquidacao ligando-as. */
  async function liquidado(
    o: LancamentoOpcoes & { contaUid: string },
    quando = agora,
    situacaoLiquidacao: 'CONFIRMADA' | 'ESTORNADA' = 'CONFIRMADA',
  ) {
    const lancamento = await criarLancamento({ ...o, situacao: 'LIQUIDADO' });
    const movimentacao = await movimentar(
      o.contaUid,
      o.titularUid,
      o.tipo === 'RECEITA' ? 'RECEBIMENTO' : 'PAGAMENTO',
      o.tipo === 'RECEITA' ? o.valorCentavos : -o.valorCentavos,
      quando,
    );
    await ctx.prisma.liquidacaoLancamento.create({
      data: {
        lancamentoUid: lancamento.uid,
        movimentacaoUid: movimentacao.uid,
        valorCentavos: o.valorCentavos,
        liquidadoEm: quando,
        situacao: situacaoLiquidacao,
      },
    });
    return lancamento;
  }

  describe('acesso e validacao', () => {
    it('exige sessao', async () => {
      const api = new ApiClient(ctx.server);
      await api
        .get('/familias/7b0e7b1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f/painel/resumo')
        .expect(401);
    });

    it('quem nao e integrante recebe 404 (nao revela a familia)', async () => {
      const dono = await signup('dono@exemplo.com');
      const familiaUid = await createFamily(dono);
      const estranho = await signup('estranho@exemplo.com');
      await estranho.get(`/familias/${familiaUid}/painel/resumo`).expect(404);
    });

    it('rejeita periodo e visao invalidos', async () => {
      const api = await signup('ana@exemplo.com');
      const familiaUid = await createFamily(api);
      await api
        .get(`/familias/${familiaUid}/painel/resumo?periodo=2026-13`)
        .expect(400);
      await api
        .get(`/familias/${familiaUid}/painel/resumo?visao=todos`)
        .expect(400);
    });
  });

  it('sem recursos financeiros: estado vazio, sem numeros inventados', async () => {
    const api = await signup('ana@exemplo.com');
    const familiaUid = await createFamily(api);
    const r = await resumo(api, familiaUid);
    expect(r.semDados).toBe(true);
    expect(r.indicadores.saldoDisponivelContas.valorCentavos).toBeNull();
    expect(r.indicadores.patrimonioLiquido.valorCentavos).toBeNull();
    expect(r.indicadores.saldoProjetadoMes.valorCentavos).toBeNull();
    expect(r.indicadores.receitasMes.valorCentavos).toBe('0');
    expect(r.taxaPoupancaBp).toBeNull();
    expect(r.receitasDespesas).toHaveLength(6);
    expect(r.receitasDespesas.at(-1)?.periodo).toBe(periodoAtual);
  });

  describe('formulas (visao pessoal)', () => {
    it('saldo, receitas, despesas, taxa de poupanca e saldo projetado', async () => {
      const api = await signup('ana@exemplo.com');
      const familiaUid = await createFamily(api);
      const ana = await userUid('ana@exemplo.com');
      const conta = await criarConta(ana, familiaUid, 'PRIVADO', 100_000n);

      await liquidado({
        contaUid: conta.uid,
        titularUid: ana,
        familiaUid,
        tipo: 'RECEITA',
        valorCentavos: 50_000n,
      });
      await liquidado({
        contaUid: conta.uid,
        titularUid: ana,
        familiaUid,
        tipo: 'DESPESA',
        valorCentavos: 20_000n,
      });
      // Previsto: nunca vira dinheiro disponivel; entra so no saldo projetado.
      await criarLancamento({
        titularUid: ana,
        familiaUid,
        tipo: 'DESPESA',
        valorCentavos: 30_000n,
      });
      await criarLancamento({
        titularUid: ana,
        familiaUid,
        tipo: 'RECEITA',
        valorCentavos: 10_000n,
      });

      const r = await resumo(api, familiaUid);
      const i = r.indicadores;
      expect(r.semDados).toBe(false);
      expect(i.saldoDisponivelContas.valorCentavos).toBe('130000');
      expect(i.receitasMes.valorCentavos).toBe('50000');
      expect(i.despesasMes.valorCentavos).toBe('20000');
      expect(r.taxaPoupancaBp).toBe(6000);
      // 130000 + 10000 previstos - 30000 previstos
      expect(i.saldoProjetadoMes.valorCentavos).toBe('110000');
      expect(i.patrimonioLiquido.valorCentavos).toBe('130000');
    });

    it('transferencia, aporte e pagamento sem lancamento nao sao receita nem despesa de consumo', async () => {
      const api = await signup('ana@exemplo.com');
      const familiaUid = await createFamily(api);
      const ana = await userUid('ana@exemplo.com');
      const conta = await criarConta(ana, familiaUid, 'PRIVADO', 0n);
      await movimentar(conta.uid, ana, 'TRANSFERENCIA_ENTRADA', 70_000n);
      await movimentar(conta.uid, ana, 'APORTE_INVESTIMENTO', -20_000n);

      const r = await resumo(api, familiaUid);
      expect(r.indicadores.saldoDisponivelContas.valorCentavos).toBe('50000');
      expect(r.indicadores.receitasMes.valorCentavos).toBe('0');
      expect(r.indicadores.despesasMes.valorCentavos).toBe('0');
    });

    it('liquidacao estornada sai de receitas e despesas', async () => {
      const api = await signup('ana@exemplo.com');
      const familiaUid = await createFamily(api);
      const ana = await userUid('ana@exemplo.com');
      const conta = await criarConta(ana, familiaUid, 'PRIVADO', 0n);
      await liquidado(
        {
          contaUid: conta.uid,
          titularUid: ana,
          familiaUid,
          tipo: 'DESPESA',
          valorCentavos: 9_000n,
        },
        agora,
        'ESTORNADA',
      );
      const r = await resumo(api, familiaUid);
      expect(r.indicadores.despesasMes.valorCentavos).toBe('0');
    });

    it('lancamento parcialmente liquidado projeta so o restante', async () => {
      const api = await signup('ana@exemplo.com');
      const familiaUid = await createFamily(api);
      const ana = await userUid('ana@exemplo.com');
      const conta = await criarConta(ana, familiaUid, 'PRIVADO', 100_000n);
      const lancamento = await criarLancamento({
        titularUid: ana,
        familiaUid,
        tipo: 'DESPESA',
        valorCentavos: 40_000n,
        situacao: 'PARCIALMENTE_LIQUIDADO',
      });
      const mov = await movimentar(conta.uid, ana, 'PAGAMENTO', -15_000n);
      await ctx.prisma.liquidacaoLancamento.create({
        data: {
          lancamentoUid: lancamento.uid,
          movimentacaoUid: mov.uid,
          valorCentavos: 15_000n,
          liquidadoEm: agora,
        },
      });
      const r = await resumo(api, familiaUid);
      // saldo 85000; restante 25000
      expect(r.indicadores.saldoDisponivelContas.valorCentavos).toBe('85000');
      expect(r.indicadores.saldoProjetadoMes.valorCentavos).toBe('60000');
    });

    it('periodo anterior mostra o realizado daquele mes e nao projeta', async () => {
      const api = await signup('ana@exemplo.com');
      const familiaUid = await createFamily(api);
      const ana = await userUid('ana@exemplo.com');
      const conta = await criarConta(ana, familiaUid, 'PRIVADO', 0n);
      await liquidado(
        {
          contaUid: conta.uid,
          titularUid: ana,
          familiaUid,
          tipo: 'RECEITA',
          valorCentavos: 77_700n,
        },
        umMesAtras,
      );
      const r = await resumo(api, familiaUid, `?periodo=${mesAnterior}`);
      expect(r.periodoReferencia).toBe(mesAnterior);
      expect(r.indicadores.receitasMes.valorCentavos).toBe('77700');
      expect(r.indicadores.saldoProjetadoMes.valorCentavos).toBeNull();
      const doMes = r.receitasDespesas.find((s) => s.periodo === mesAnterior);
      expect(doMes?.receitasCentavos).toBe('77700');
    });

    it('nao perde precisao com valores acima do limite seguro de ponto flutuante', async () => {
      const api = await signup('ana@exemplo.com');
      const familiaUid = await createFamily(api);
      const ana = await userUid('ana@exemplo.com');
      await criarConta(ana, familiaUid, 'PRIVADO', 9_007_199_254_740_993n);
      const r = await resumo(api, familiaUid);
      expect(r.indicadores.saldoDisponivelContas.valorCentavos).toBe(
        '9007199254740993',
      );
    });

    it('agrupa despesas por categoria com participacao', async () => {
      const api = await signup('ana@exemplo.com');
      const familiaUid = await createFamily(api);
      const ana = await userUid('ana@exemplo.com');
      const conta = await criarConta(ana, familiaUid, 'PRIVADO', 0n);
      const mercado = await ctx.prisma.categoriaFinanceira.create({
        data: { titularUid: ana, tipo: 'DESPESA', nome: 'Mercado' },
      });
      const lazer = await ctx.prisma.categoriaFinanceira.create({
        data: { titularUid: ana, tipo: 'DESPESA', nome: 'Lazer' },
      });
      for (const [categoria, valor] of [
        [mercado, 30_000n],
        [mercado, 20_000n],
        [lazer, 50_000n],
      ] as const) {
        await liquidado({
          contaUid: conta.uid,
          titularUid: ana,
          familiaUid,
          tipo: 'DESPESA',
          valorCentavos: valor,
          categoriaUid: categoria.uid,
        });
      }
      const r = await resumo(api, familiaUid);
      expect(r.despesasPorCategoria).toEqual([
        expect.objectContaining({
          nome: expect.stringMatching(/Mercado|Lazer/) as string,
          valorCentavos: '50000',
          participacaoBp: 5000,
        }),
        expect.objectContaining({
          valorCentavos: '50000',
          participacaoBp: 5000,
        }),
      ]);
    });
  });

  describe('isolamento e visao familiar (autoriza antes de agregar)', () => {
    it('dados de outro integrante nunca entram na visao pessoal, nem para o administrador', async () => {
      const admin = await signup('admin@exemplo.com');
      const familiaUid = await createFamily(admin);
      const bia = await join(admin, familiaUid, 'bia@exemplo.com');
      const biaUid = await userUid('bia@exemplo.com');
      const adminUid = await userUid('admin@exemplo.com');
      const contaBia = await criarConta(
        biaUid,
        familiaUid,
        'PRIVADO',
        500_000n,
      );
      await liquidado({
        contaUid: contaBia.uid,
        titularUid: biaUid,
        familiaUid,
        tipo: 'RECEITA',
        valorCentavos: 123_000n,
      });
      await criarConta(adminUid, familiaUid, 'PRIVADO', 1_000n);

      const doAdmin = await resumo(admin, familiaUid);
      expect(doAdmin.indicadores.saldoDisponivelContas.valorCentavos).toBe(
        '1000',
      );
      expect(doAdmin.indicadores.receitasMes.valorCentavos).toBe('0');

      const adminFamiliar = await resumo(admin, familiaUid, '?visao=familiar');
      expect(adminFamiliar.semDados).toBe(true);

      const daBia = await resumo(bia, familiaUid);
      expect(daBia.indicadores.saldoDisponivelContas.valorCentavos).toBe(
        '623000',
      );
    });

    it('visao familiar soma so contas compartilhadas e orcamento familiar, sem duplicar por integrante', async () => {
      const admin = await signup('admin@exemplo.com');
      const familiaUid = await createFamily(admin);
      const bia = await join(admin, familiaUid, 'bia@exemplo.com');
      const adminUid = await userUid('admin@exemplo.com');
      const biaUid = await userUid('bia@exemplo.com');

      const casa = await criarConta(
        adminUid,
        familiaUid,
        'COMPARTILHADO',
        200_000n,
      );
      await criarConta(adminUid, familiaUid, 'PRIVADO', 999_000n);
      await criarConta(biaUid, familiaUid, 'PRIVADO', 888_000n);

      // Despesa compartilhada da familia, registrada pela Bia na conta da casa.
      await liquidado({
        contaUid: casa.uid,
        titularUid: biaUid,
        familiaUid,
        tipo: 'DESPESA',
        valorCentavos: 40_000n,
        visibilidade: 'COMPARTILHADO',
        escopo: 'FAMILIAR',
      });

      for (const api of [admin, bia]) {
        const familiar = await resumo(api, familiaUid, '?visao=familiar');
        expect(familiar.indicadores.saldoDisponivelContas.valorCentavos).toBe(
          '160000',
        );
        expect(familiar.indicadores.despesasMes.valorCentavos).toBe('40000');
      }

      // Na visao pessoal da Bia a despesa FAMILIAR nao soma (so consulta).
      const pessoalBia = await resumo(bia, familiaUid);
      expect(pessoalBia.indicadores.despesasMes.valorCentavos).toBe('0');
    });

    it('conta restrita so entra para quem tem concessao ativa', async () => {
      const admin = await signup('admin@exemplo.com');
      const familiaUid = await createFamily(admin);
      const bia = await join(admin, familiaUid, 'bia@exemplo.com');
      const adminUid = await userUid('admin@exemplo.com');
      const biaUid = await userUid('bia@exemplo.com');
      const restrita = await criarConta(
        adminUid,
        familiaUid,
        'RESTRITO',
        50_000n,
      );

      const sem = await resumo(bia, familiaUid, '?visao=familiar');
      expect(sem.indicadores.saldoDisponivelContas.valorCentavos).toBeNull();

      const concessao = await ctx.prisma.permissaoRecursoFamilia.create({
        data: {
          familiaUid,
          usuarioUid: biaUid,
          concedidoPorUid: adminUid,
          tipoRecurso: 'CONTA',
          recursoUid: restrita.uid,
        },
      });
      const com = await resumo(bia, familiaUid, '?visao=familiar');
      expect(com.indicadores.saldoDisponivelContas.valorCentavos).toBe('50000');

      await ctx.prisma.permissaoRecursoFamilia.update({
        where: { uid: concessao.uid },
        data: { revogadaEm: new Date() },
      });
      const revogada = await resumo(bia, familiaUid, '?visao=familiar');
      expect(
        revogada.indicadores.saldoDisponivelContas.valorCentavos,
      ).toBeNull();
    });

    it('categoria privada de outro integrante nao revela o nome no agregado familiar', async () => {
      const admin = await signup('admin@exemplo.com');
      const familiaUid = await createFamily(admin);
      const bia = await join(admin, familiaUid, 'bia@exemplo.com');
      const adminUid = await userUid('admin@exemplo.com');
      const biaUid = await userUid('bia@exemplo.com');
      const casa = await criarConta(adminUid, familiaUid, 'COMPARTILHADO', 0n);
      const segredo = await ctx.prisma.categoriaFinanceira.create({
        data: {
          titularUid: biaUid,
          tipo: 'DESPESA',
          nome: 'Presente surpresa',
          visibilidade: 'PRIVADO',
        },
      });
      await liquidado({
        contaUid: casa.uid,
        titularUid: biaUid,
        familiaUid,
        tipo: 'DESPESA',
        valorCentavos: 12_000n,
        visibilidade: 'COMPARTILHADO',
        escopo: 'FAMILIAR',
        categoriaUid: segredo.uid,
      });

      const visto = await resumo(admin, familiaUid, '?visao=familiar');
      expect(visto.despesasPorCategoria.map((c) => c.nome)).toEqual([
        'Outras categorias',
      ]);
      expect(JSON.stringify(visto)).not.toContain('Presente surpresa');

      const dona = await resumo(bia, familiaUid, '?visao=familiar');
      expect(dona.despesasPorCategoria.map((c) => c.nome)).toEqual([
        'Presente surpresa',
      ]);
    });

    it('familias diferentes nao se misturam', async () => {
      const ana = await signup('ana@exemplo.com');
      const familiaA = await createFamily(ana);
      const anaUid = await userUid('ana@exemplo.com');
      await criarConta(anaUid, familiaA, 'COMPARTILHADO', 10_000n);

      const bia = await signup('bia@exemplo.com');
      const familiaB = await createFamily(bia);
      const biaUid = await userUid('bia@exemplo.com');
      await criarConta(biaUid, familiaB, 'COMPARTILHADO', 20_000n);

      const deAna = await resumo(ana, familiaA, '?visao=familiar');
      expect(deAna.indicadores.saldoDisponivelContas.valorCentavos).toBe(
        '10000',
      );
      await ana.get(`/familias/${familiaB}/painel/resumo`).expect(404);
    });
  });
});
