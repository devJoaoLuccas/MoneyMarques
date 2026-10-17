import {
  ApiClient,
  createTestContext,
  registerAndVerify,
  resetDatabase,
  sessionCookieFrom,
  strongPassword,
  TestContext,
  withCookie,
} from './support/test-app';

/** RF-013 | AUTH-003 | CA-013..CA-016, RN-AUTH-010 */
describe('Autenticacao: recuperacao de senha (e2e)', () => {
  let ctx: TestContext;
  const email = 'ana@exemplo.com';
  const newPassword = 'outra frase nova e segura';

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    ctx.mailbox.clear();
    ctx.limiter.clearAll();
    await registerAndVerify(ctx, email);
    ctx.mailbox.clear();
    ctx.limiter.clearAll();
  });

  const forgot = (address: string) =>
    new ApiClient(ctx.server).post('/auth/password/forgot', { email: address });

  describe('solicitacao', () => {
    it('CA-013: resposta neutra, igual para e-mail existente e inexistente', async () => {
      const known = await forgot(email);
      const unknown = await forgot('ninguem@exemplo.com');

      expect(known.status).toBe(202);
      expect(unknown.status).toBe(known.status);
      expect(unknown.body).toEqual(known.body);
    });

    it('so envia e-mail quando a conta existe, com token no fragmento da URL', async () => {
      await forgot('ninguem@exemplo.com');
      expect(ctx.mailbox.messages).toHaveLength(0);

      await forgot(email);
      expect(ctx.mailbox.to(email)).toHaveLength(1);
      expect(ctx.mailbox.to(email)[0].text).toMatch(/\/redefinir-senha#token=/);
    });

    it('limite por e-mail e silencioso: continua 202 mas nao reenvia', async () => {
      for (let i = 0; i < 3; i++) await forgot(email).expect(202);
      expect(ctx.mailbox.to(email)).toHaveLength(3);

      const fourth = await forgot(email);
      expect(fourth.status).toBe(202);
      expect(ctx.mailbox.to(email)).toHaveLength(3);
    });

    it('novo pedido invalida o token anterior', async () => {
      await forgot(email);
      const first = ctx.mailbox.lastToken(email);
      await forgot(email);

      const res = await new ApiClient(ctx.server).post('/auth/password/reset', {
        token: first,
        senha: newPassword,
      });
      expect(res.status).toBe(400);
    });
  });

  describe('redefinicao', () => {
    let token: string;

    beforeEach(async () => {
      await forgot(email);
      token = ctx.mailbox.lastToken(email);
    });

    it('CA-015: troca a senha, encerra todas as sessoes, avisa por e-mail e invalida o token', async () => {
      // Sessao aberta antes da redefinicao.
      const loggedIn = await new ApiClient(ctx.server)
        .post('/auth/login', { email, senha: strongPassword })
        .expect(200);
      const oldCookie = sessionCookieFrom(loggedIn);

      const api = new ApiClient(ctx.server);
      const res = await api.post('/auth/password/reset', {
        token,
        senha: newPassword,
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'password_reset' });

      // Sessao antiga revogada.
      expect(
        (await withCookie(ctx.server, oldCookie).get('/auth/session')).body,
      ).toEqual({
        status: 'auth_required',
      });

      // Senha antiga nao funciona mais; a nova sim.
      ctx.limiter.clearAll();
      await new ApiClient(ctx.server)
        .post('/auth/login', { email, senha: strongPassword })
        .expect(401);
      await new ApiClient(ctx.server)
        .post('/auth/login', { email, senha: newPassword })
        .expect(200);

      // Notificacao da alteracao.
      expect(ctx.mailbox.to(email).at(-1)?.subject).toMatch(
        /senha foi alterada/i,
      );

      // CA-014: token de uso unico.
      const reuse = await api.post('/auth/password/reset', {
        token,
        senha: newPassword,
      });
      expect(reuse.status).toBe(400);
      expect(reuse.body.code).toBe('INVALID_TOKEN');
    });

    it('CA-014: rejeita token inexistente e expirado', async () => {
      const api = new ApiClient(ctx.server);
      expect(
        (
          await api.post('/auth/password/reset', {
            token: 'inventado',
            senha: newPassword,
          })
        ).status,
      ).toBe(400);

      await ctx.prisma.tokenAutenticacao.updateMany({
        data: { expiraEm: new Date(Date.now() - 1000) },
      });
      expect(
        (await api.post('/auth/password/reset', { token, senha: newPassword }))
          .status,
      ).toBe(400);
    });

    it('CA-015: senha fora da politica e recusada sem consumir o token', async () => {
      const api = new ApiClient(ctx.server);
      const weak = await api.post('/auth/password/reset', {
        token,
        senha: 'curta',
      });
      expect(weak.status).toBe(400);
      expect(weak.body.errors.senha).toBeDefined();

      await api
        .post('/auth/password/reset', { token, senha: newPassword })
        .expect(200);
    });

    it('um token de verificacao de e-mail nao serve para redefinir senha', async () => {
      await ctx.prisma.tokenAutenticacao.updateMany({
        data: { tipo: 'VERIFICACAO_EMAIL' },
      });
      const res = await new ApiClient(ctx.server).post('/auth/password/reset', {
        token,
        senha: newPassword,
      });
      expect(res.status).toBe(400);
    });

    it('nao grava senha nem token na auditoria (RN-AUTH-003)', async () => {
      await new ApiClient(ctx.server)
        .post('/auth/password/reset', { token, senha: newPassword })
        .expect(200);
      const events = JSON.stringify(
        await ctx.prisma.eventoAuditoria.findMany(),
      );
      expect(events).not.toContain(newPassword);
      expect(events).not.toContain(token);
    });
  });
});
