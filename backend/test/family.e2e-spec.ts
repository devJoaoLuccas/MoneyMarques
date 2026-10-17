import {
  ApiClient,
  createTestContext,
  registerAndVerify,
  resetDatabase,
  strongPassword,
  TestContext,
} from './support/test-app';

/**
 * RF-001/RF-002/RF-013 | Modulo 02 (Gestao Familiar), fases 0 a 4:
 * contexto familiar, criacao, integrantes e convites. Banco real.
 */
interface MemberPage {
  total: number;
  itens: { email: string; nome: string; voce: boolean }[];
}

describe('Gestao familiar (e2e)', () => {
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

  async function createFamily(api: ApiClient, nome = 'Familia Silva') {
    const res = await api.post('/familias', { nome }).expect(201);
    return res.body as { uid: string; nome: string; papel: string };
  }

  /** Convida e faz o convidado aceitar; devolve o cliente do novo integrante. */
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

  /** E-mails de convite (ignora a verificacao de e-mail enviada no cadastro). */
  const inviteMails = (email: string) =>
    ctx.mailbox.to(email).filter((m) => m.subject.startsWith('Convite'));

  const memberUid = async (familiaUid: string, email: string) =>
    (
      await ctx.prisma.integranteFamilia.findFirstOrThrow({
        where: {
          familiaUid,
          usuarioUid: await userUid(email),
          situacao: 'ATIVO',
        },
      })
    ).uid;

  describe('criacao e listagem (FAM-001, RN-FAM-001/002)', () => {
    it('FAM-001 | RN-FAM-001/002: cria a familia e torna o criador ADMINISTRADOR ativo', async () => {
      const ana = await signup('ana@exemplo.com');
      const res = await ana
        .post('/familias', {
          nome: '  Familia   Silva ',
          descricao: ' Casa  da   familia ',
          avatar: 'casa',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        nome: 'Familia Silva',
        descricao: 'Casa da familia',
        avatar: 'casa',
        papel: 'ADMINISTRADOR',
      });
      const vinculo = await ctx.prisma.integranteFamilia.findFirstOrThrow({
        where: { familiaUid: res.body.uid },
      });
      expect(vinculo).toMatchObject({
        papel: 'ADMINISTRADOR',
        situacao: 'ATIVO',
        usuarioUid: await userUid('ana@exemplo.com'),
      });
    });

    it('FAM-001: valida nome (3 a 40), descricao (ate 240) e avatar no servidor', async () => {
      const ana = await signup('ana@exemplo.com');
      const curto = await ana.post('/familias', { nome: 'ab' }).expect(400);
      expect(curto.body.errors.nome).toBeDefined();
      const longo = await ana
        .post('/familias', { nome: 'a'.repeat(41) })
        .expect(400);
      expect(longo.body.errors.nome).toBeDefined();
      const descricao = await ana
        .post('/familias', { nome: 'Familia', descricao: 'x'.repeat(241) })
        .expect(400);
      expect(descricao.body.errors.descricao).toBeDefined();
      const avatar = await ana
        .post('/familias', { nome: 'Familia', avatar: 'http://x/y.png' })
        .expect(400);
      expect(avatar.body.errors.avatar).toBeDefined();
      expect(await ctx.prisma.familia.count()).toBe(0);
    });

    it('CA-FAM-003: falha ao criar o vinculo reverte a familia (atomico)', async () => {
      const ana = await signup('ana@exemplo.com');
      const real = ctx.prisma.$transaction.bind(ctx.prisma) as (
        fn: (tx: object) => Promise<unknown>,
      ) => Promise<unknown>;
      jest
        .spyOn(ctx.prisma, '$transaction')
        .mockImplementationOnce((fn: (tx: unknown) => Promise<unknown>) =>
          real((tx) =>
            fn(
              new Proxy(tx, {
                get: (target, prop, receiver) =>
                  prop === 'integranteFamilia'
                    ? { create: () => Promise.reject(new Error('falha')) }
                    : Reflect.get(target, prop, receiver),
              }),
            ),
          ),
        );

      await ana.post('/familias', { nome: 'Familia Silva' }).expect(500);

      expect(await ctx.prisma.familia.count()).toBe(0);
      expect(await ctx.prisma.integranteFamilia.count()).toBe(0);
    });

    it('lista somente as familias do proprio usuario', async () => {
      const ana = await signup('ana@exemplo.com');
      const bia = await signup('bia@exemplo.com');
      await createFamily(ana, 'Familia Ana');
      await createFamily(bia, 'Familia Bia');

      const res = await ana.get('/familias').expect(200);
      expect(res.body.itens).toHaveLength(1);
      expect(res.body.itens[0].nome).toBe('Familia Ana');
    });

    it('registra auditoria da criacao com a familia', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const evento = await ctx.prisma.eventoAuditoria.findFirstOrThrow({
        where: { acao: 'familia.criar' },
      });
      expect(evento.familiaUid).toBe(familia.uid);
      expect(evento.resultado).toBe('SUCESSO');
    });
  });

  describe('isolamento e autorizacao (IDOR/BOLA, RN-FAM-010)', () => {
    it('exige sessao autenticada', async () => {
      const anon = new ApiClient(ctx.server);
      await anon.get('/familias').expect(401);
      await anon
        .get('/familias/00000000-0000-4000-8000-000000000000')
        .expect(401);
    });

    it('quem nao e integrante recebe 404 em todos os endpoints com :familiaUid', async () => {
      const ana = await signup('ana@exemplo.com');
      const intruso = await signup('intruso@exemplo.com');
      const familia = await createFamily(ana);
      const base = `/familias/${familia.uid}`;
      const algumUid = '00000000-0000-4000-8000-000000000000';

      await intruso.get(base).expect(404);
      await intruso.get(`${base}/integrantes`).expect(404);
      await intruso
        .patch(`${base}/integrantes/${algumUid}`, { papel: 'VISUALIZADOR' })
        .expect(404);
      await intruso.delete(`${base}/integrantes/${algumUid}`).expect(404);
      await intruso
        .post(`${base}/convites`, { email: 'x@exemplo.com' })
        .expect(404);
      await intruso.get(`${base}/convites`).expect(404);
      await intruso.post(`${base}/convites/${algumUid}/revogar`).expect(404);
      await intruso.post(`${base}/convites/${algumUid}/reenviar`).expect(404);
    });

    it('familia inexistente e UID invalido respondem igual (404), sem revelar existencia', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const bia = await signup('bia@exemplo.com');

      const existente = await bia.get(`/familias/${familia.uid}`).expect(404);
      const inexistente = await bia
        .get('/familias/00000000-0000-4000-8000-000000000000')
        .expect(404);
      const invalido = await bia.get('/familias/nao-e-uuid').expect(404);
      expect(inexistente.body).toEqual(existente.body);
      expect(invalido.body).toEqual(existente.body);
    });

    it('nega e audita acesso a familia alheia', async () => {
      const ana = await signup('ana@exemplo.com');
      const intruso = await signup('intruso@exemplo.com');
      const familia = await createFamily(ana);
      await intruso.get(`/familias/${familia.uid}`).expect(404);

      const evento = await ctx.prisma.eventoAuditoria.findFirstOrThrow({
        where: { acao: 'familia.acesso_negado' },
      });
      expect(evento.resultado).toBe('NEGADO');
      expect(evento.usuarioUid).toBe(await userUid('intruso@exemplo.com'));
    });

    it('escalacao de privilegio: INTEGRANTE e VISUALIZADOR nao executam rotas de ADMIN (403)', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const base = `/familias/${familia.uid}`;
      const integrante = await join(ana, familia.uid, 'int@exemplo.com');
      const visualizador = await join(
        ana,
        familia.uid,
        'vis@exemplo.com',
        'VISUALIZADOR',
      );
      const alvo = await memberUid(familia.uid, 'ana@exemplo.com');

      for (const api of [integrante, visualizador]) {
        await api
          .post(`${base}/convites`, { email: 'novo@exemplo.com' })
          .expect(403);
        await api.get(`${base}/convites`).expect(403);
        await api
          .patch(`${base}/integrantes/${alvo}`, { papel: 'VISUALIZADOR' })
          .expect(403);
        await api.delete(`${base}/integrantes/${alvo}`).expect(403);
        // Mas ambos conseguem consultar a familia e os integrantes.
        await api.get(base).expect(200);
        await api.get(`${base}/integrantes`).expect(200);
      }
      expect(
        await ctx.prisma.integranteFamilia.count({
          where: { familiaUid: familia.uid, situacao: 'ATIVO' },
        }),
      ).toBe(3);
    });
  });

  describe('integrantes (FAM-003, RN-FAM-005/014/016)', () => {
    it('lista com paginacao, filtros e e-mail completo so para o administrador (D-FAM-007)', async () => {
      const ana = await signup('ana@exemplo.com', 'Ana Admin');
      const familia = await createFamily(ana);
      const bruno = await join(ana, familia.uid, 'bruno@exemplo.com');
      const base = `/familias/${familia.uid}/integrantes`;

      const admin = (await ana.get(base).expect(200)).body as MemberPage;
      expect(admin.total).toBe(2);
      expect(admin.itens.map((i) => i.email)).toEqual([
        'ana@exemplo.com',
        'bruno@exemplo.com',
      ]);
      expect(admin.itens.find((i) => i.voce)?.nome).toBe('Ana Admin');

      const comum = (await bruno.get(base).expect(200)).body as MemberPage;
      expect(comum.itens.map((i) => i.email)).toEqual([
        'a***@exemplo.com',
        'b***@exemplo.com',
      ]);

      const pagina = await ana.get(`${base}?tamanho=1&pagina=2`).expect(200);
      expect(pagina.body.itens).toHaveLength(1);
      expect(pagina.body.total).toBe(2);

      const porNome = await ana.get(`${base}?nome=bruno`).expect(200);
      expect(porNome.body.itens).toHaveLength(1);
      const porPapel = await ana.get(`${base}?papel=ADMINISTRADOR`).expect(200);
      expect(porPapel.body.itens).toHaveLength(1);
      await ana.get(`${base}?tamanho=1000`).expect(400);
    });

    it('FAM-003: admin altera o papel (com auditoria); promocao exige confirmacao', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      await join(ana, familia.uid, 'bruno@exemplo.com');
      const alvo = await memberUid(familia.uid, 'bruno@exemplo.com');
      const url = `/familias/${familia.uid}/integrantes/${alvo}`;

      await ana.patch(url, { papel: 'VISUALIZADOR' }).expect(204);
      expect(
        (
          await ctx.prisma.integranteFamilia.findUniqueOrThrow({
            where: { uid: alvo },
          })
        ).papel,
      ).toBe('VISUALIZADOR');
      const evento = await ctx.prisma.eventoAuditoria.findFirstOrThrow({
        where: { acao: 'integrante.alterar_papel' },
      });
      expect(evento.alteracoesSeguras).toEqual({
        papelAnterior: 'INTEGRANTE',
        papelNovo: 'VISUALIZADOR',
      });

      const semConfirmar = await ana
        .patch(url, { papel: 'ADMINISTRADOR' })
        .expect(400);
      expect(semConfirmar.body.errors.confirmarPromocao).toBeDefined();
      await ana
        .patch(url, { papel: 'ADMINISTRADOR', confirmarPromocao: true })
        .expect(204);
    });

    it('CA-FAM-010: nao rebaixa nem remove o ultimo administrador', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const propria = await memberUid(familia.uid, 'ana@exemplo.com');
      const url = `/familias/${familia.uid}/integrantes/${propria}`;

      const rebaixar = await ana
        .patch(url, { papel: 'INTEGRANTE' })
        .expect(409);
      expect(rebaixar.body.code).toBe('LAST_ADMIN_REQUIRED');
      const remover = await ana.delete(url).expect(409);
      expect(remover.body.code).toBe('LAST_ADMIN_REQUIRED');
      expect(
        await ctx.prisma.integranteFamilia.count({
          where: {
            familiaUid: familia.uid,
            papel: 'ADMINISTRADOR',
            situacao: 'ATIVO',
          },
        }),
      ).toBe(1);
    });

    it('RN-FAM-016: dois administradores se rebaixando ao mesmo tempo (sempre sobra 1)', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const bruno = await join(ana, familia.uid, 'bruno@exemplo.com');
      const brunoUid = await memberUid(familia.uid, 'bruno@exemplo.com');
      await ana
        .patch(`/familias/${familia.uid}/integrantes/${brunoUid}`, {
          papel: 'ADMINISTRADOR',
          confirmarPromocao: true,
        })
        .expect(204);
      const anaUid = await memberUid(familia.uid, 'ana@exemplo.com');

      const [r1, r2] = await Promise.all([
        ana.patch(`/familias/${familia.uid}/integrantes/${brunoUid}`, {
          papel: 'INTEGRANTE',
        }),
        bruno.patch(`/familias/${familia.uid}/integrantes/${anaUid}`, {
          papel: 'INTEGRANTE',
        }),
      ]);

      expect([r1.status, r2.status].sort()).toEqual([204, 409]);
      expect(
        await ctx.prisma.integranteFamilia.count({
          where: {
            familiaUid: familia.uid,
            papel: 'ADMINISTRADOR',
            situacao: 'ATIVO',
          },
        }),
      ).toBe(1);
    });

    it('CA-FAM-011/012/017: remocao logica revoga o acesso na proxima requisicao e preserva o historico', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const bruno = await join(ana, familia.uid, 'bruno@exemplo.com');
      const alvo = await memberUid(familia.uid, 'bruno@exemplo.com');
      await bruno.get(`/familias/${familia.uid}`).expect(200);

      await ana
        .delete(`/familias/${familia.uid}/integrantes/${alvo}`)
        .expect(204);

      // Sessao de Bruno continua valida, mas o acesso a familia acabou.
      await bruno.get(`/familias/${familia.uid}`).expect(404);
      await bruno.get(`/familias/${familia.uid}/integrantes`).expect(404);
      const vinculo = await ctx.prisma.integranteFamilia.findUniqueOrThrow({
        where: { uid: alvo },
      });
      expect(vinculo.situacao).toBe('REMOVIDO');
      expect(vinculo.removidoEm).not.toBeNull();
      expect(
        await ctx.prisma.eventoAuditoria.count({
          where: { acao: 'integrante.remover', familiaUid: familia.uid },
        }),
      ).toBe(1);

      // Admin ve o historico; os demais, apenas ativos.
      const historico = await ana
        .get(`/familias/${familia.uid}/integrantes?situacao=REMOVIDO`)
        .expect(200);
      expect(historico.body.itens).toHaveLength(1);
    });

    it('removido pode ser convidado de novo e reingressa (vinculo ativo unico)', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      await join(ana, familia.uid, 'bruno@exemplo.com');
      const alvo = await memberUid(familia.uid, 'bruno@exemplo.com');
      await ana
        .delete(`/familias/${familia.uid}/integrantes/${alvo}`)
        .expect(204);

      const bruno = new ApiClient(ctx.server);
      await bruno
        .post('/auth/login', {
          email: 'bruno@exemplo.com',
          senha: strongPassword,
        })
        .expect(200);
      await ana
        .post(`/familias/${familia.uid}/convites`, {
          email: 'bruno@exemplo.com',
        })
        .expect(201);
      await bruno
        .post('/convites/aceitar', {
          token: ctx.mailbox.lastToken('bruno@exemplo.com'),
        })
        .expect(200);

      await bruno.get(`/familias/${familia.uid}`).expect(200);
      expect(
        await ctx.prisma.integranteFamilia.count({
          where: { familiaUid: familia.uid },
        }),
      ).toBe(3);
    });

    it('usuario em varias familias nao vaza dados entre contextos', async () => {
      const ana = await signup('ana@exemplo.com');
      const bia = await signup('bia@exemplo.com');
      const f1 = await createFamily(ana, 'Familia Um');
      const f2 = await createFamily(bia, 'Familia Dois');
      await ana
        .post(`/familias/${f1.uid}/convites`, { email: 'bia@exemplo.com' })
        .expect(201);
      await bia
        .post('/convites/aceitar', {
          token: ctx.mailbox.lastToken('bia@exemplo.com'),
        })
        .expect(200);

      const lista = await bia.get('/familias').expect(200);
      expect(lista.body.itens).toHaveLength(2);
      await ana.get(`/familias/${f2.uid}`).expect(404);
      const integrantesF1 = await bia
        .get(`/familias/${f1.uid}/integrantes`)
        .expect(200);
      expect(integrantesF1.body.itens).toHaveLength(2);
    });
  });

  describe('convites (FAM-005, RN-FAM-007/008)', () => {
    it('FAM-005 | RN-FAM-007: emite convite, envia e-mail HTML com link e guarda apenas o hash do token', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const res = await ana
        .post(`/familias/${familia.uid}/convites`, {
          email: '  Bruno@Exemplo.com ',
          papel: 'VISUALIZADOR',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        email: 'bruno@exemplo.com',
        papel: 'VISUALIZADOR',
        situacao: 'PENDENTE',
      });
      expect(res.body.token).toBeUndefined();

      const [mensagem] = inviteMails('bruno@exemplo.com');
      const token = ctx.mailbox.lastToken('bruno@exemplo.com');
      expect(mensagem.html).toContain('<!DOCTYPE html>');
      expect(mensagem.html).toContain('Familia Silva');
      expect(mensagem.text).toContain('/convite#token=');

      const convite = await ctx.prisma.conviteFamilia.findFirstOrThrow();
      expect(convite.tokenHash).not.toContain(token);
      expect(convite.tokenHash).not.toBe(token);
      expect(convite.emailDestinoCriptografado).not.toContain('bruno');
      expect(convite.expiraEm.getTime()).toBeGreaterThan(
        Date.now() + 6 * 24 * 3600 * 1000,
      );
    });

    it('valida e-mail e papel; bloqueia duplicado pendente e quem ja e integrante', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const url = `/familias/${familia.uid}/convites`;

      await ana.post(url, { email: 'invalido' }).expect(400);
      await ana
        .post(url, { email: 'a@exemplo.com', papel: 'SUPERUSER' })
        .expect(400);
      await ana.post(url, { email: 'bruno@exemplo.com' }).expect(201);
      const duplicado = await ana
        .post(url, { email: 'BRUNO@exemplo.com' })
        .expect(409);
      expect(duplicado.body.code).toBe('INVITE_ALREADY_PENDING');
      const membro = await ana
        .post(url, { email: 'ana@exemplo.com' })
        .expect(409);
      expect(membro.body.code).toBe('ALREADY_MEMBER');
    });

    it('resposta neutra: e-mail com conta e sem conta recebem o mesmo tratamento', async () => {
      const ana = await signup('ana@exemplo.com');
      await signup('existente@exemplo.com');
      const familia = await createFamily(ana);
      const url = `/familias/${familia.uid}/convites`;

      const comConta = await ana
        .post(url, { email: 'existente@exemplo.com' })
        .expect(201);
      const semConta = await ana
        .post(url, { email: 'naoexiste@exemplo.com' })
        .expect(201);
      expect(Object.keys(comConta.body).sort()).toEqual(
        Object.keys(semConta.body).sort(),
      );
      expect(inviteMails('existente@exemplo.com')).toHaveLength(1);
      expect(inviteMails('naoexiste@exemplo.com')).toHaveLength(1);
    });

    it('limita a emissao de convites por administrador (429)', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const url = `/familias/${familia.uid}/convites`;
      for (let i = 0; i < 20; i++) {
        await ana.post(url, { email: `pessoa${i}@exemplo.com` }).expect(201);
      }
      const res = await ana
        .post(url, { email: 'pessoa21@exemplo.com' })
        .expect(429);
      expect(res.body.code).toBe('TOO_MANY_ATTEMPTS');
    });

    it('lista convites (admin), com paginacao e filtro de situacao', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const url = `/familias/${familia.uid}/convites`;
      await ana.post(url, { email: 'a@exemplo.com' }).expect(201);
      await ana.post(url, { email: 'b@exemplo.com' }).expect(201);

      const todos = await ana.get(url).expect(200);
      expect(todos.body.total).toBe(2);
      const pagina = await ana.get(`${url}?tamanho=1`).expect(200);
      expect(pagina.body.itens).toHaveLength(1);
      const aceitos = await ana.get(`${url}?situacao=ACEITO`).expect(200);
      expect(aceitos.body.total).toBe(0);
    });

    it('aceite: previa sem dados financeiros, vinculo com o papel oferecido e auditoria', async () => {
      const ana = await signup('ana@exemplo.com', 'Ana Admin');
      const familia = await createFamily(ana);
      const bruno = await signup('bruno@exemplo.com');
      await ana
        .post(`/familias/${familia.uid}/convites`, {
          email: 'bruno@exemplo.com',
          papel: 'VISUALIZADOR',
        })
        .expect(201);
      const token = ctx.mailbox.lastToken('bruno@exemplo.com');

      const previa = await bruno
        .post('/convites/previa', { token })
        .expect(200);
      expect(Object.keys(previa.body).sort()).toEqual([
        'convidadoPorNome',
        'expiraEm',
        'familiaNome',
        'papelOferecido',
      ]);
      expect(previa.body.familiaNome).toBe('Familia Silva');

      const res = await bruno.post('/convites/aceitar', { token }).expect(200);
      expect(res.body.familiaUid).toBe(familia.uid);
      const vinculo = await ctx.prisma.integranteFamilia.findFirstOrThrow({
        where: {
          familiaUid: familia.uid,
          usuarioUid: await userUid('bruno@exemplo.com'),
        },
      });
      expect(vinculo).toMatchObject({
        papel: 'VISUALIZADOR',
        situacao: 'ATIVO',
      });
      expect(
        (await ctx.prisma.conviteFamilia.findFirstOrThrow()).situacao,
      ).toBe('ACEITO');
      expect(
        await ctx.prisma.eventoAuditoria.count({
          where: { acao: 'convite.aceitar' },
        }),
      ).toBe(1);
    });

    it('aceite e idempotente para o mesmo usuario (um unico vinculo)', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const bruno = await signup('bruno@exemplo.com');
      await ana
        .post(`/familias/${familia.uid}/convites`, {
          email: 'bruno@exemplo.com',
        })
        .expect(201);
      const token = ctx.mailbox.lastToken('bruno@exemplo.com');

      await bruno.post('/convites/aceitar', { token }).expect(200);
      await bruno.post('/convites/aceitar', { token }).expect(200);
      expect(
        await ctx.prisma.integranteFamilia.count({
          where: { familiaUid: familia.uid, situacao: 'ATIVO' },
        }),
      ).toBe(2);
    });

    it('aceites concorrentes do mesmo convite geram um unico vinculo (CA-FAM-020)', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const bruno = await signup('bruno@exemplo.com');
      await ana
        .post(`/familias/${familia.uid}/convites`, {
          email: 'bruno@exemplo.com',
        })
        .expect(201);
      const token = ctx.mailbox.lastToken('bruno@exemplo.com');

      const results = await Promise.all([
        bruno.post('/convites/aceitar', { token }),
        bruno.post('/convites/aceitar', { token }),
        bruno.post('/convites/aceitar', { token }),
      ]);

      expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
      expect(
        await ctx.prisma.integranteFamilia.count({
          where: {
            familiaUid: familia.uid,
            usuarioUid: await userUid('bruno@exemplo.com'),
            situacao: 'ATIVO',
          },
        }),
      ).toBe(1);
    });

    it('CA-FAM-018: convite aceito por e-mail diferente e rejeitado de forma neutra', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const bruno = await signup('bruno@exemplo.com');
      const carla = await signup('carla@exemplo.com');
      await ana
        .post(`/familias/${familia.uid}/convites`, {
          email: 'bruno@exemplo.com',
        })
        .expect(201);
      const token = ctx.mailbox.lastToken('bruno@exemplo.com');

      const outroEmail = await carla.post('/convites/aceitar', { token });
      const tokenFalso = await carla.post('/convites/aceitar', {
        token: 'token-que-nao-existe',
      });
      expect(outroEmail.status).toBe(400);
      expect(outroEmail.body).toEqual(tokenFalso.body);
      await carla.post('/convites/previa', { token }).expect(400);
      await carla.post('/convites/recusar', { token }).expect(400);

      // O convite continua valido para o destinatario correto.
      await bruno.post('/convites/aceitar', { token }).expect(200);
      expect(
        await ctx.prisma.integranteFamilia.count({
          where: {
            familiaUid: familia.uid,
            usuarioUid: await userUid('carla@exemplo.com'),
          },
        }),
      ).toBe(0);
    });

    it('token reutilizado por outro usuario apos o aceite e rejeitado', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const bruno = await signup('bruno@exemplo.com');
      const carla = await signup('carla@exemplo.com');
      await ana
        .post(`/familias/${familia.uid}/convites`, {
          email: 'bruno@exemplo.com',
        })
        .expect(201);
      const token = ctx.mailbox.lastToken('bruno@exemplo.com');
      await bruno.post('/convites/aceitar', { token }).expect(200);

      await carla.post('/convites/aceitar', { token }).expect(400);
    });

    it('FAM-005 | RN-FAM-008: convite expirado nao pode ser aceito e e marcado como EXPIRADO', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const bruno = await signup('bruno@exemplo.com');
      await ana
        .post(`/familias/${familia.uid}/convites`, {
          email: 'bruno@exemplo.com',
        })
        .expect(201);
      const token = ctx.mailbox.lastToken('bruno@exemplo.com');
      await ctx.prisma.conviteFamilia.updateMany({
        data: { expiraEm: new Date(Date.now() - 1000) },
      });

      await bruno.post('/convites/aceitar', { token }).expect(400);
      expect(
        (await ctx.prisma.conviteFamilia.findFirstOrThrow()).situacao,
      ).toBe('EXPIRADO');
      expect(
        await ctx.prisma.integranteFamilia.count({
          where: { familiaUid: familia.uid, situacao: 'ATIVO' },
        }),
      ).toBe(1);

      // Convite expirado nao bloqueia um novo para o mesmo e-mail.
      await ana
        .post(`/familias/${familia.uid}/convites`, {
          email: 'bruno@exemplo.com',
        })
        .expect(201);
    });

    it('recusa: convite vira RECUSADO, sem vinculo', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const bruno = await signup('bruno@exemplo.com');
      await ana
        .post(`/familias/${familia.uid}/convites`, {
          email: 'bruno@exemplo.com',
        })
        .expect(201);
      const token = ctx.mailbox.lastToken('bruno@exemplo.com');

      await bruno.post('/convites/recusar', { token }).expect(204);
      expect(
        (await ctx.prisma.conviteFamilia.findFirstOrThrow()).situacao,
      ).toBe('RECUSADO');
      await bruno.post('/convites/aceitar', { token }).expect(400);
      expect(
        await ctx.prisma.integranteFamilia.count({
          where: { familiaUid: familia.uid, situacao: 'ATIVO' },
        }),
      ).toBe(1);
    });

    it('revogacao: o link deixa de funcionar e a acao e auditada', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const bruno = await signup('bruno@exemplo.com');
      const emitido = await ana
        .post(`/familias/${familia.uid}/convites`, {
          email: 'bruno@exemplo.com',
        })
        .expect(201);
      const token = ctx.mailbox.lastToken('bruno@exemplo.com');

      await ana
        .post(`/familias/${familia.uid}/convites/${emitido.body.uid}/revogar`)
        .expect(204);
      await bruno.post('/convites/aceitar', { token }).expect(400);
      const novamente = await ana
        .post(`/familias/${familia.uid}/convites/${emitido.body.uid}/revogar`)
        .expect(409);
      expect(novamente.body.code).toBe('INVITE_NOT_PENDING');
      expect(
        await ctx.prisma.eventoAuditoria.count({
          where: { acao: 'convite.revogar' },
        }),
      ).toBe(1);
    });

    it('reenvio: novo token invalida o anterior', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const bruno = await signup('bruno@exemplo.com');
      const emitido = await ana
        .post(`/familias/${familia.uid}/convites`, {
          email: 'bruno@exemplo.com',
        })
        .expect(201);
      const antigo = ctx.mailbox.lastToken('bruno@exemplo.com');

      await ana
        .post(`/familias/${familia.uid}/convites/${emitido.body.uid}/reenviar`)
        .expect(202);
      const novo = ctx.mailbox.lastToken('bruno@exemplo.com');

      expect(novo).not.toBe(antigo);
      expect(inviteMails('bruno@exemplo.com')).toHaveLength(2);
      await bruno.post('/convites/aceitar', { token: antigo }).expect(400);
      await bruno.post('/convites/aceitar', { token: novo }).expect(200);
    });

    it('convite nao pode ser revogado/reenviado por outra familia (IDOR)', async () => {
      const ana = await signup('ana@exemplo.com');
      const bia = await signup('bia@exemplo.com');
      const f1 = await createFamily(ana, 'Familia Um');
      const f2 = await createFamily(bia, 'Familia Dois');
      const emitido = await ana
        .post(`/familias/${f1.uid}/convites`, { email: 'x@exemplo.com' })
        .expect(201);

      await bia
        .post(`/familias/${f2.uid}/convites/${emitido.body.uid}/revogar`)
        .expect(404);
      await bia
        .post(`/familias/${f2.uid}/convites/${emitido.body.uid}/reenviar`)
        .expect(404);
      expect(
        (await ctx.prisma.conviteFamilia.findFirstOrThrow()).situacao,
      ).toBe('PENDENTE');
    });

    it('quem ainda nao tinha conta aceita depois de se cadastrar com o e-mail convidado', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      await ana
        .post(`/familias/${familia.uid}/convites`, {
          email: 'novo@exemplo.com',
        })
        .expect(201);
      const token = ctx.mailbox.lastToken('novo@exemplo.com');

      const novo = await signup('novo@exemplo.com');
      await novo.post('/convites/aceitar', { token }).expect(200);
      await novo.get(`/familias/${familia.uid}`).expect(200);
    });

    it('aceite/recusa pela lista de pendentes da sessao (por uid, so do proprio e-mail)', async () => {
      const ana = await signup('ana@exemplo.com');
      const familia = await createFamily(ana);
      const bruno = await signup('bruno@exemplo.com');
      const carla = await signup('carla@exemplo.com');
      const emitido = await ana
        .post(`/familias/${familia.uid}/convites`, {
          email: 'bruno@exemplo.com',
        })
        .expect(201);

      const sessao = await bruno.get('/auth/session').expect(200);
      expect(sessao.body.contexto.convitesPendentes[0].uid).toBe(
        emitido.body.uid,
      );

      await carla
        .post(`/convites/pendentes/${emitido.body.uid}/aceitar`)
        .expect(404);
      await bruno
        .post(`/convites/pendentes/${emitido.body.uid}/aceitar`)
        .expect(200);
      await bruno.get(`/familias/${familia.uid}`).expect(200);
    });

    it('rotas de resposta exigem sessao autenticada', async () => {
      await new ApiClient(ctx.server)
        .post('/convites/aceitar', { token: 'qualquer' })
        .expect(401);
    });
  });
});
