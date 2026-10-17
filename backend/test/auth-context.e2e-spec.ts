import {
  ApiClient,
  createTestContext,
  registerAndVerify,
  resetDatabase,
  strongPassword,
  TestContext,
} from './support/test-app';

/** RF-001/RF-013 | AUTH-005 | RN-AUTH-012 (a selecao orienta a navegacao; nao autoriza) */
describe('Autenticacao: contexto familiar apos o login (e2e)', () => {
  let ctx: TestContext;
  const email = 'ana@exemplo.com';

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    ctx.limiter.clearAll();
    await registerAndVerify(ctx, email);
    ctx.limiter.clearAll();
  });

  const loginView = async () =>
    (
      await new ApiClient(ctx.server)
        .post('/auth/login', { email, senha: strongPassword })
        .expect(200)
    ).body;

  const userUid = async () =>
    (
      await ctx.prisma.usuario.findUniqueOrThrow({
        where: { emailHmac: ctx.vault.hmac(email) },
      })
    ).uid;

  async function createFamily(
    nome: string,
    criadorUid: string,
    member?: { uid: string },
  ) {
    const familia = await ctx.prisma.familia.create({
      data: { nome, criadorUid },
    });
    if (member) {
      await ctx.prisma.integranteFamilia.create({
        data: {
          familiaUid: familia.uid,
          usuarioUid: member.uid,
          papel: 'ADMINISTRADOR',
        },
      });
    }
    return familia;
  }

  it('sem familia nem convite: onboarding', async () => {
    const view = await loginView();
    expect(view.contexto).toEqual({
      tipo: 'sem_familia',
      familias: [],
      convitesPendentes: [],
    });
  });

  it('uma unica familia ativa: ingressa direto', async () => {
    const uid = await userUid();
    await createFamily('Familia Silva', uid, { uid });

    const { contexto } = await loginView();
    expect(contexto.tipo).toBe('unico');
    expect(contexto.familias).toEqual([
      expect.objectContaining({
        nome: 'Familia Silva',
        papel: 'ADMINISTRADOR',
      }),
    ]);
  });

  it('varias familias: abre a selecao', async () => {
    const uid = await userUid();
    await createFamily('Familia Silva', uid, { uid });
    await createFamily('Familia Souza', uid, { uid });

    const { contexto } = await loginView();
    expect(contexto.tipo).toBe('multiplo');
    expect(contexto.familias).toHaveLength(2);
  });

  it('ignora familia encerrada e integrante removido', async () => {
    const uid = await userUid();
    const encerrada = await createFamily('Encerrada', uid, { uid });
    await ctx.prisma.familia.update({
      where: { uid: encerrada.uid },
      data: { encerradaEm: new Date() },
    });
    const removido = await createFamily('Removido', uid, { uid });
    await ctx.prisma.integranteFamilia.updateMany({
      where: { familiaUid: removido.uid },
      data: { situacao: 'REMOVIDO', removidoEm: new Date() },
    });

    const { contexto } = await loginView();
    expect(contexto.tipo).toBe('sem_familia');
  });

  describe('convites pendentes', () => {
    async function invite(
      overrides: { situacao?: 'PENDENTE' | 'REVOGADO'; expiraEm?: Date } = {},
    ) {
      const owner = await ctx.prisma.usuario.create({
        data: {
          nomeCompleto: 'Dono',
          ...ctx.vault.seal(`dono-${Math.random()}@exemplo.com`),
          senhaHash: 'x',
        },
      });
      const familia = await createFamily('Familia Convite', owner.uid, owner);
      return ctx.prisma.conviteFamilia.create({
        data: {
          familiaUid: familia.uid,
          emitidoPorUid: owner.uid,
          emailDestinoHmac: ctx.vault.hmac(email),
          emailDestinoCriptografado: ctx.vault.seal(email).emailCriptografado,
          tokenHash: `hash-${Math.random()}`,
          situacao: overrides.situacao ?? 'PENDENTE',
          expiraEm: overrides.expiraEm ?? new Date(Date.now() + 86_400_000),
        },
      });
    }

    it('sem familia e com convite valido: apresenta o fluxo de aceite (sem expor o token)', async () => {
      await invite();
      const { contexto } = await loginView();
      expect(contexto.tipo).toBe('convite_pendente');
      expect(contexto.convitesPendentes).toEqual([
        expect.objectContaining({
          familiaNome: 'Familia Convite',
          papelOferecido: 'INTEGRANTE',
        }),
      ]);
      expect(JSON.stringify(contexto)).not.toMatch(/hash-/);
    });

    it('convite expirado ou revogado nao conta', async () => {
      await invite({ expiraEm: new Date(Date.now() - 1000) });
      await invite({ situacao: 'REVOGADO' });
      const { contexto } = await loginView();
      expect(contexto.tipo).toBe('sem_familia');
      expect(contexto.convitesPendentes).toEqual([]);
    });

    it('quem ja tem familia continua nela; o convite so aparece listado', async () => {
      const uid = await userUid();
      await createFamily('Minha Familia', uid, { uid });
      await invite();
      const { contexto } = await loginView();
      expect(contexto.tipo).toBe('unico');
      expect(contexto.convitesPendentes).toHaveLength(1);
    });
  });
});
