import { generateInviteCode } from '../src/modules/family/domain/invite-code';
import {
  ApiClient,
  createTestContext,
  registerAndVerify,
  resetDatabase,
  strongPassword,
  TestContext,
} from './support/test-app';

/**
 * RF-001/RF-002 | D-FAM-009: codigo de convite (entrada sem e-mail de destino).
 * Uso unico, 24 h, papel nunca ADMINISTRADOR, so o HMAC e guardado, resposta
 * neutra e limite de tentativas erradas. Banco real.
 */
describe('Codigo de convite da familia (e2e)', () => {
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

  const gerar = async (admin: ApiClient, familiaUid: string, papel?: string) =>
    (
      await admin
        .post(`/familias/${familiaUid}/codigos-convite`, papel ? { papel } : {})
        .expect(201)
    ).body as {
      uid: string;
      codigo: string;
      papel: string;
      expiraEm: string;
    };

  it('o administrador gera o codigo (XXXX-XXXX, 24 h) e so o hash fica no banco', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const antes = Date.now();
    const gerado = await gerar(admin, familiaUid);

    expect(gerado.codigo).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(gerado.papel).toBe('INTEGRANTE');
    const horas = (new Date(gerado.expiraEm).getTime() - antes) / 3_600_000;
    expect(horas).toBeGreaterThan(23.9);
    expect(horas).toBeLessThan(24.1);

    const linhas = await ctx.prisma.codigoConviteFamilia.findMany();
    expect(linhas).toHaveLength(1);
    expect(JSON.stringify(linhas)).not.toContain(
      gerado.codigo.replace('-', ''),
    );
    expect(linhas[0].codigoHash).toMatch(/^[0-9a-f]{64}$/);

    // A listagem nunca devolve o codigo.
    const lista = (
      await admin.get(`/familias/${familiaUid}/codigos-convite`).expect(200)
    ).body as Record<string, unknown>[];
    expect(lista).toHaveLength(1);
    expect(JSON.stringify(lista)).not.toContain(gerado.codigo.replace('-', ''));
  });

  it('so administrador gera, lista e revoga; nunca oferece o papel ADMINISTRADOR', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const bia = await signup('bia@exemplo.com');
    const gerado = await gerar(admin, familiaUid);
    await bia
      .post('/convites/codigo/entrar', { codigo: gerado.codigo })
      .expect(200);

    await bia.post(`/familias/${familiaUid}/codigos-convite`, {}).expect(403);
    await bia.get(`/familias/${familiaUid}/codigos-convite`).expect(403);
    await bia
      .post(`/familias/${familiaUid}/codigos-convite/${gerado.uid}/revogar`)
      .expect(403);

    const res = await admin
      .post(`/familias/${familiaUid}/codigos-convite`, {
        papel: 'ADMINISTRADOR',
      })
      .expect(400);
    expect(res.body.errors.papel).toBeDefined();
    expect(
      await ctx.prisma.codigoConviteFamilia.count({
        where: { papelOferecido: 'ADMINISTRADOR' },
      }),
    ).toBe(0);
  });

  it('quem digita o codigo ve a previa e entra com o papel escolhido (aceita minusculas e sem hifen)', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const gerado = await gerar(admin, familiaUid, 'VISUALIZADOR');
    const bia = await signup('bia@exemplo.com');

    const digitado = gerado.codigo.replace('-', '').toLowerCase();
    const previa = await bia
      .post('/convites/codigo/previa', { codigo: digitado })
      .expect(200);
    expect(previa.body).toMatchObject({
      familiaNome: 'Familia Silva',
      papelOferecido: 'VISUALIZADOR',
    });
    expect(Object.keys(previa.body as object).sort()).toEqual([
      'convidadoPorNome',
      'expiraEm',
      'familiaNome',
      'papelOferecido',
    ]);
    // A previa nao consome.
    expect(
      (await ctx.prisma.codigoConviteFamilia.findFirstOrThrow()).situacao,
    ).toBe('ATIVO');

    const entrada = await bia
      .post('/convites/codigo/entrar', { codigo: digitado })
      .expect(200);
    expect(entrada.body).toEqual({ familiaUid });
    const vinculo = await ctx.prisma.integranteFamilia.findFirstOrThrow({
      where: {
        familiaUid,
        usuario: { emailHmac: ctx.vault.hmac('bia@exemplo.com') },
      },
    });
    expect(vinculo).toMatchObject({ papel: 'VISUALIZADOR', situacao: 'ATIVO' });
    const usado = await ctx.prisma.codigoConviteFamilia.findFirstOrThrow();
    expect(usado.situacao).toBe('USADO');
    expect(usado.usadoPorUid).toBe(vinculo.usuarioUid);

    const sessao = await bia.get('/auth/session').expect(200);
    expect(JSON.stringify(sessao.body)).toContain('Familia Silva');
  });

  it('uso unico: o segundo usuario nao entra com o mesmo codigo', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const gerado = await gerar(admin, familiaUid);
    const bia = await signup('bia@exemplo.com');
    const caio = await signup('caio@exemplo.com');

    await bia
      .post('/convites/codigo/entrar', { codigo: gerado.codigo })
      .expect(200);
    const res = await caio
      .post('/convites/codigo/entrar', { codigo: gerado.codigo })
      .expect(400);
    expect(res.body.code).toBe('INVALID_INVITE_CODE');
    expect(
      await ctx.prisma.integranteFamilia.count({
        where: { familiaUid, situacao: 'ATIVO' },
      }),
    ).toBe(2);
  });

  it('usos concorrentes do mesmo codigo geram um unico vinculo', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const gerado = await gerar(admin, familiaUid);
    const bia = await signup('bia@exemplo.com');
    const caio = await signup('caio@exemplo.com');

    const [a, b] = await Promise.all([
      bia.post('/convites/codigo/entrar', { codigo: gerado.codigo }),
      caio.post('/convites/codigo/entrar', { codigo: gerado.codigo }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 400]);
    expect(
      await ctx.prisma.integranteFamilia.count({
        where: { familiaUid, situacao: 'ATIVO' },
      }),
    ).toBe(2);
  });

  it('quem ja e integrante nao consome o codigo', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const gerado = await gerar(admin, familiaUid);
    await admin
      .post('/convites/codigo/entrar', { codigo: gerado.codigo })
      .expect(200);
    expect(
      (await ctx.prisma.codigoConviteFamilia.findFirstOrThrow()).situacao,
    ).toBe('ATIVO');
  });

  it('codigo expirado ou revogado responde igual a um codigo inexistente', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const expirado = await gerar(admin, familiaUid);
    await ctx.prisma.codigoConviteFamilia.update({
      where: { uid: expirado.uid },
      data: { expiraEm: new Date(Date.now() - 1000) },
    });
    const revogado = await gerar(admin, familiaUid);
    await admin
      .post(`/familias/${familiaUid}/codigos-convite/${revogado.uid}/revogar`)
      .expect(204);
    const bia = await signup('bia@exemplo.com');

    const respostas = [];
    for (const codigo of [
      expirado.codigo,
      revogado.codigo,
      generateInviteCode(),
      'curto',
      '!!!',
    ]) {
      const res = await bia
        .post('/convites/codigo/entrar', { codigo })
        .expect(400);
      respostas.push(res.body);
    }
    for (const corpo of respostas) expect(corpo).toEqual(respostas[0]);
    expect(respostas[0].code).toBe('INVALID_INVITE_CODE');
    expect(
      await ctx.prisma.integranteFamilia.count({
        where: { situacao: 'ATIVO' },
      }),
    ).toBe(1);
  });

  it('bloqueia depois de 5 tentativas erradas, mesmo com o codigo correto', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const gerado = await gerar(admin, familiaUid);
    const bia = await signup('bia@exemplo.com');

    for (let i = 0; i < 5; i++) {
      await bia
        .post('/convites/codigo/entrar', { codigo: 'AAAA-AAAA' })
        .expect(400);
    }
    const bloqueado = await bia
      .post('/convites/codigo/entrar', { codigo: gerado.codigo })
      .expect(429);
    expect(bloqueado.body.code).toBe('TOO_MANY_ATTEMPTS');
    // A previa tambem e bloqueada (nao serve de oraculo).
    await bia
      .post('/convites/codigo/previa', { codigo: gerado.codigo })
      .expect(429);
    expect(
      (await ctx.prisma.codigoConviteFamilia.findFirstOrThrow()).situacao,
    ).toBe('ATIVO');
  });

  it('audita emissao, uso e tentativas erradas sem gravar o codigo', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const gerado = await gerar(admin, familiaUid);
    const bia = await signup('bia@exemplo.com');
    await bia
      .post('/convites/codigo/entrar', { codigo: 'AAAA-AAAA' })
      .expect(400);
    await bia
      .post('/convites/codigo/entrar', { codigo: gerado.codigo })
      .expect(200);

    const eventos = await ctx.prisma.eventoAuditoria.findMany({
      where: { acao: { startsWith: 'codigo_convite.' } },
    });
    expect(eventos.map((e) => e.acao).sort()).toEqual([
      'codigo_convite.emitir',
      'codigo_convite.tentativa',
      'codigo_convite.usar',
    ]);
    expect(JSON.stringify(eventos)).not.toContain(
      gerado.codigo.replace('-', ''),
    );
    expect(JSON.stringify(eventos)).not.toContain('AAAA');
  });

  it('exige sessao e valida o corpo', async () => {
    const anonimo = new ApiClient(ctx.server);
    await anonimo
      .post('/convites/codigo/entrar', { codigo: 'AAAA-AAAA' })
      .expect(401);
    const bia = await signup('bia@exemplo.com');
    await bia.post('/convites/codigo/entrar', {}).expect(400);
    await bia
      .post('/convites/codigo/entrar', { codigo: 'x'.repeat(40) })
      .expect(400);
  });

  it('o administrador de outra familia nao revoga nem lista codigos desta', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const gerado = await gerar(admin, familiaUid);
    const outro = await signup('outro@exemplo.com');
    const outraFamilia = (
      (await outro.post('/familias', { nome: 'Outra Familia' })).body as {
        uid: string;
      }
    ).uid;

    await outro.get(`/familias/${familiaUid}/codigos-convite`).expect(404);
    await outro
      .post(`/familias/${outraFamilia}/codigos-convite/${gerado.uid}/revogar`)
      .expect(404);
    expect(
      (await ctx.prisma.codigoConviteFamilia.findFirstOrThrow()).situacao,
    ).toBe('ATIVO');
  });
});
