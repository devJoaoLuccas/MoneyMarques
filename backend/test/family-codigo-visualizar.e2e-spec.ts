import {
  ApiClient,
  createTestContext,
  registerAndVerify,
  resetDatabase,
  strongPassword,
  TestContext,
} from './support/test-app';

/**
 * D-FAM-009 (revisao): um codigo ATIVO por familia, copia cifrada que permite
 * ao administrador visualiza-lo de novo e some quando o codigo deixa de valer.
 */
describe('Codigo de convite: visualizar o codigo ativo (e2e)', () => {
  let ctx: TestContext;

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

  async function signup(email: string) {
    await registerAndVerify(ctx, email, { nome: 'Pessoa Teste' });
    ctx.limiter.clearAll();
    const api = new ApiClient(ctx.server);
    await api.post('/auth/login', { email, senha: strongPassword }).expect(200);
    return api;
  }

  async function familiaComAdmin() {
    const admin = await signup('admin@exemplo.com');
    const familiaUid = (
      (await admin.post('/familias', { nome: 'Familia Silva' })).body as {
        uid: string;
      }
    ).uid;
    return { admin, familiaUid };
  }

  const gerar = async (admin: ApiClient, familiaUid: string) =>
    (
      await admin
        .post(`/familias/${familiaUid}/codigos-convite`, {})
        .expect(201)
    ).body as {
      uid: string;
      codigo: string;
    };

  it('o administrador revisualiza o mesmo codigo ativo, sem cache, e a leitura e auditada', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const gerado = await gerar(admin, familiaUid);

    const res = await admin
      .get(`/familias/${familiaUid}/codigos-convite/ativo`)
      .expect(200);
    expect(res.body).toMatchObject({
      uid: gerado.uid,
      codigo: gerado.codigo,
      situacao: 'ATIVO',
    });
    expect(res.headers['cache-control']).toBe('no-store');

    const eventos = await ctx.prisma.eventoAuditoria.findMany({
      where: { acao: 'codigo_convite.visualizar' },
    });
    expect(eventos).toHaveLength(1);
    expect(JSON.stringify(eventos)).not.toContain(
      gerado.codigo.replace('-', ''),
    );
  });

  it('no banco o codigo fica cifrado (nunca em texto puro) e a listagem nao o devolve', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const gerado = await gerar(admin, familiaUid);

    const linha = await ctx.prisma.codigoConviteFamilia.findFirstOrThrow();
    expect(linha.codigoCriptografado).toMatch(/^v1:/);
    const puro = gerado.codigo.replace('-', '');
    expect(JSON.stringify(linha)).not.toContain(puro);
    expect(JSON.stringify(linha)).not.toContain(gerado.codigo);

    const lista = await admin
      .get(`/familias/${familiaUid}/codigos-convite`)
      .expect(200);
    expect(JSON.stringify(lista.body)).not.toContain(puro);
    expect(lista.body[0]).not.toHaveProperty('codigo');
    expect(lista.body[0]).not.toHaveProperty('codigoCriptografado');
  });

  it('so um codigo ativo por familia; depois de revogar e possivel gerar outro', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const primeiro = await gerar(admin, familiaUid);

    const segundo = await admin
      .post(`/familias/${familiaUid}/codigos-convite`, {})
      .expect(409);
    expect(segundo.body.code).toBe('INVITE_CODE_ACTIVE');
    expect(await ctx.prisma.codigoConviteFamilia.count()).toBe(1);

    await admin
      .post(`/familias/${familiaUid}/codigos-convite/${primeiro.uid}/revogar`)
      .expect(204);
    const novo = await gerar(admin, familiaUid);
    expect(novo.codigo).not.toBe(primeiro.codigo);
  });

  it('geracoes simultaneas produzem um unico codigo ativo', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const [a, b] = await Promise.all([
      admin.post(`/familias/${familiaUid}/codigos-convite`, {}),
      admin.post(`/familias/${familiaUid}/codigos-convite`, {}),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(
      await ctx.prisma.codigoConviteFamilia.count({
        where: { situacao: 'ATIVO' },
      }),
    ).toBe(1);
  });

  it('a copia cifrada some quando o codigo e usado, revogado ou expira', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const bia = await signup('bia@exemplo.com');

    const usado = await gerar(admin, familiaUid);
    await bia
      .post('/convites/codigo/entrar', { codigo: usado.codigo })
      .expect(200);
    await admin
      .get(`/familias/${familiaUid}/codigos-convite/ativo`)
      .expect(404);

    const revogado = await gerar(admin, familiaUid);
    await admin
      .post(`/familias/${familiaUid}/codigos-convite/${revogado.uid}/revogar`)
      .expect(204);

    const expirado = await gerar(admin, familiaUid);
    await ctx.prisma.codigoConviteFamilia.update({
      where: { uid: expirado.uid },
      data: { expiraEm: new Date(Date.now() - 1000) },
    });
    await admin
      .get(`/familias/${familiaUid}/codigos-convite/ativo`)
      .expect(404);

    const restantes = await ctx.prisma.codigoConviteFamilia.findMany();
    expect(restantes).toHaveLength(3);
    expect(restantes.every((r) => r.codigoCriptografado === null)).toBe(true);
    expect(restantes.map((r) => r.situacao).sort()).toEqual([
      'EXPIRADO',
      'REVOGADO',
      'USADO',
    ]);
  });

  it('sem codigo ativo: 404; so administrador visualiza', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    await admin
      .get(`/familias/${familiaUid}/codigos-convite/ativo`)
      .expect(404);

    const codigo = await gerar(admin, familiaUid);
    const bia = await signup('bia@exemplo.com');
    await bia
      .post('/convites/codigo/entrar', { codigo: codigo.codigo })
      .expect(200);
    await gerar(admin, familiaUid);
    await bia.get(`/familias/${familiaUid}/codigos-convite/ativo`).expect(403);

    const estranho = await signup('estranho@exemplo.com');
    await estranho
      .get(`/familias/${familiaUid}/codigos-convite/ativo`)
      .expect(404);
  });

  it('codigo ativo gerado antes da copia cifrada: avisa que nao pode ser exibido', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const gerado = await gerar(admin, familiaUid);
    await ctx.prisma.codigoConviteFamilia.update({
      where: { uid: gerado.uid },
      data: { codigoCriptografado: null },
    });

    const res = await admin
      .get(`/familias/${familiaUid}/codigos-convite/ativo`)
      .expect(409);
    expect(res.body.code).toBe('INVITE_CODE_HIDDEN');
    expect(res.body.message).toMatch(/Revogue-o e gere outro/);
  });

  it('o banco impede dois ativos na mesma familia e copia cifrada em codigo nao ativo', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const gerado = await gerar(admin, familiaUid);
    const adminUid = (await ctx.prisma.codigoConviteFamilia.findFirstOrThrow())
      .emitidoPorUid;

    await expect(
      ctx.prisma.codigoConviteFamilia.create({
        data: {
          familiaUid,
          emitidoPorUid: adminUid,
          codigoHash: 'a'.repeat(64),
          expiraEm: new Date(Date.now() + 60_000),
        },
      }),
    ).rejects.toThrow();
    await expect(
      ctx.prisma.codigoConviteFamilia.update({
        where: { uid: gerado.uid },
        data: { situacao: 'USADO' },
      }),
    ).rejects.toThrow();
  });
});
