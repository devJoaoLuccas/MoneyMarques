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
import request from 'supertest';

/** RF-013 | AUTH-001, AUTH-002 | CA-001..CA-012, RN-AUTH-002/004/005/006/007/009 */
describe('Autenticacao: cadastro, verificacao de e-mail e login (e2e)', () => {
  let ctx: TestContext;

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
  });

  const register = (api: ApiClient, overrides: object = {}) =>
    api.post('/auth/register', {
      nomeCompleto: 'Ana Teste',
      email: 'ana@exemplo.com',
      senha: strongPassword,
      aceiteTermos: true,
      ...overrides,
    });

  describe('protecao CSRF (RN-AUTH-006)', () => {
    it('rejeita escrita sem o header X-CSRF-Protection', async () => {
      const res = await request(ctx.server)
        .post('/api/auth/login')
        .send({ email: 'a@a.com', senha: 'x' });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CSRF_REJECTED');
    });

    it('rejeita Origin de terceiros', async () => {
      const res = await request(ctx.server)
        .post('/api/auth/login')
        .set('X-CSRF-Protection', '1')
        .set('Origin', 'https://malicioso.example')
        .send({ email: 'a@a.com', senha: 'x' });
      expect(res.status).toBe(403);
    });
  });

  describe('cadastro (AUTH-002)', () => {
    it('CA-008: aplica a politica de senha no servidor com erro por campo', async () => {
      const res = await register(new ApiClient(ctx.server), { senha: 'curta' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.errors.senha).toContain(
        'A senha deve ter pelo menos 12 caracteres.',
      );
      expect(res.body.errors.senha.length).toBeGreaterThan(1);
    });

    it('exige aceite dos termos e e-mail valido', async () => {
      const res = await register(new ApiClient(ctx.server), {
        aceiteTermos: false,
        email: 'invalido',
      });
      expect(res.status).toBe(400);
      expect(res.body.errors.aceiteTermos).toBeDefined();
      expect(res.body.errors.email).toBeDefined();
    });

    it('rejeita campos desconhecidos (whitelist)', async () => {
      const res = await register(new ApiClient(ctx.server), { admin: true });
      expect(res.status).toBe(400);
    });

    it('cria usuario com e-mail normalizado, preferencias padrao (12 meses) e senha em Argon2id', async () => {
      const res = await register(new ApiClient(ctx.server), {
        email: '  ANA@Exemplo.com ',
        nomeCompleto: '  Ana   Maria  ',
      });
      expect(res.status).toBe(202);
      expect(res.body).toEqual({ status: 'verification_pending' });

      const user = await ctx.prisma.usuario.findUniqueOrThrow({
        where: { emailHmac: ctx.vault.hmac('ana@exemplo.com') },
        include: { preferencias: true },
      });
      expect(user.nomeCompleto).toBe('Ana Maria');
      expect(user.senhaHash.startsWith('$argon2id$')).toBe(true);
      expect(user.senhaHash).not.toContain(strongPassword);
      expect(user.emailVerificadoEm).toBeNull();
      expect(user.preferencias?.horizonteMeses).toBe(12);
      expect(ctx.mailbox.to('ana@exemplo.com')).toHaveLength(1);
    });

    it('CA-009: cadastro duplicado responde igual e avisa o dono por e-mail', async () => {
      const first = await register(new ApiClient(ctx.server));
      ctx.mailbox.clear();
      const second = await register(new ApiClient(ctx.server), {
        nomeCompleto: 'Outra Pessoa',
        senha: 'Outra-Frase-Longa-Segura-1',
      });

      expect(second.status).toBe(first.status);
      expect(second.body).toEqual(first.body);
      expect(await ctx.prisma.usuario.count()).toBe(1);
      const original = await ctx.prisma.usuario.findFirstOrThrow();
      expect(original.nomeCompleto).toBe('Ana Teste');
      expect(ctx.mailbox.to('ana@exemplo.com')[0].subject).toMatch(
        /Tentativa de cadastro/,
      );
    });

    it('RF-013: o e-mail nunca fica em texto puro; so HMAC-SHA-256 e copia cifrada', async () => {
      await register(new ApiClient(ctx.server), {
        email: 'Ana@Exemplo.com',
      }).expect(202);

      const rows = await ctx.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        'SELECT * FROM usuario',
      );
      expect(rows).toHaveLength(1);
      expect(Object.keys(rows[0])).not.toContain('email');
      expect(JSON.stringify(rows[0]).toLowerCase()).not.toContain(
        'ana@exemplo.com',
      );
      expect(JSON.stringify(rows[0]).toLowerCase()).not.toContain('exemplo');

      const user = await ctx.prisma.usuario.findFirstOrThrow();
      expect(user.emailHmac).toMatch(/^[0-9a-f]{64}$/);
      expect(user.emailHmac).toBe(ctx.vault.hmac('ana@exemplo.com'));
      expect(ctx.vault.open(user.emailCriptografado)).toBe('ana@exemplo.com');
    });

    it('e-mail com caixa diferente e tratado como o mesmo cadastro', async () => {
      await register(new ApiClient(ctx.server)).expect(202);
      await register(new ApiClient(ctx.server), {
        email: 'ANA@EXEMPLO.COM',
      }).expect(202);
      expect(await ctx.prisma.usuario.count()).toBe(1);
    });

    it('a exibicao do e-mail na sessao vem da copia cifrada', async () => {
      await registerAndVerify(ctx, 'ana@exemplo.com');
      ctx.limiter.clearAll();
      const api = new ApiClient(ctx.server);
      await api
        .post('/auth/login', {
          email: 'ana@exemplo.com',
          senha: strongPassword,
        })
        .expect(200);
      const res = await api.get('/auth/session').expect(200);
      expect(res.body.usuario.email).toBe('ana@exemplo.com');
    });

    it('limita cadastros por IP (RN-AUTH-004)', async () => {
      const api = new ApiClient(ctx.server);
      for (let i = 0; i < 10; i++) {
        await register(api, { email: `u${i}@exemplo.com` }).expect(202);
      }
      const res = await register(api, { email: 'u11@exemplo.com' });
      expect(res.status).toBe(429);
      expect(res.headers['retry-after']).toBeDefined();
    });
  });

  describe('verificacao de e-mail (RN-AUTH-009, CA-010)', () => {
    beforeEach(async () => {
      await register(new ApiClient(ctx.server)).expect(202);
    });

    it('o token vai no fragmento da URL e so o hash fica no banco', async () => {
      const text = ctx.mailbox.to('ana@exemplo.com')[0].text;
      expect(text).toMatch(/\/verificar-email#token=/);
      const token = ctx.mailbox.lastToken('ana@exemplo.com');
      const stored = await ctx.prisma.tokenAutenticacao.findFirstOrThrow();
      expect(stored.tokenHash).not.toContain(token);
    });

    it('confirma o e-mail uma unica vez', async () => {
      const api = new ApiClient(ctx.server);
      const token = ctx.mailbox.lastToken('ana@exemplo.com');

      await api.post('/auth/email/verify', { token }).expect(200);
      const user = await ctx.prisma.usuario.findUniqueOrThrow({
        where: { emailHmac: ctx.vault.hmac('ana@exemplo.com') },
      });
      expect(user.emailVerificadoEm).not.toBeNull();

      const reuse = await api.post('/auth/email/verify', { token });
      expect(reuse.status).toBe(400);
      expect(reuse.body.code).toBe('INVALID_TOKEN');
    });

    it('rejeita token inexistente e token expirado', async () => {
      const api = new ApiClient(ctx.server);
      expect(
        (await api.post('/auth/email/verify', { token: 'nao-existe' })).status,
      ).toBe(400);

      await ctx.prisma.tokenAutenticacao.updateMany({
        data: { expiraEm: new Date(Date.now() - 1000) },
      });
      const expired = await api.post('/auth/email/verify', {
        token: ctx.mailbox.lastToken('ana@exemplo.com'),
      });
      expect(expired.status).toBe(400);
      expect(expired.body.code).toBe('INVALID_TOKEN');
    });

    it('novo envio invalida o token anterior', async () => {
      const api = new ApiClient(ctx.server);
      const oldToken = ctx.mailbox.lastToken('ana@exemplo.com');
      await api
        .post('/auth/login', {
          email: 'ana@exemplo.com',
          senha: strongPassword,
        })
        .expect(200);
      await api.post('/auth/email/resend').expect(202);

      expect(
        (await api.post('/auth/email/verify', { token: oldToken })).status,
      ).toBe(400);
      const fresh = ctx.mailbox.lastToken('ana@exemplo.com');
      expect(fresh).not.toBe(oldToken);
      await api.post('/auth/email/verify', { token: fresh }).expect(200);
    });

    it('com e-mail pendente a sessao nao acessa rotas privadas nem expoe dados', async () => {
      const api = new ApiClient(ctx.server);
      const login = await api
        .post('/auth/login', {
          email: 'ana@exemplo.com',
          senha: strongPassword,
        })
        .expect(200);
      expect(login.body.status).toBe('email_verification_required');
      expect(login.body.usuario).toEqual({ email: 'ana@exemplo.com' });
      expect(login.body.contexto).toBeUndefined();

      const privateRoute = await api.post('/auth/mfa/setup');
      expect(privateRoute.status).toBe(403);
      expect(privateRoute.body.code).toBe('EMAIL_VERIFICATION_REQUIRED');
    });
  });

  describe('login (AUTH-001)', () => {
    beforeEach(async () => {
      await registerAndVerify(ctx, 'ana@exemplo.com');
      ctx.limiter.clearAll();
    });

    it('CA-001/RN-AUTH-007: credenciais validas abrem sessao por cookie HttpOnly sem expor token no corpo', async () => {
      const api = new ApiClient(ctx.server);
      const res = await api
        .post('/auth/login', {
          email: ' ANA@exemplo.com ',
          senha: strongPassword,
        })
        .expect(200);

      expect(res.body.status).toBe('authenticated');
      expect(res.body.usuario.email).toBe('ana@exemplo.com');
      expect(res.body.contexto.tipo).toBe('sem_familia');
      expect(JSON.stringify(res.body)).not.toMatch(/token/i);

      const cookie = (res.headers['set-cookie'] as unknown as string[])[0];
      expect(cookie).toMatch(/^mm_session=/);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
      // Sem "manter sessao": cookie de sessao (sem Expires/Max-Age).
      expect(cookie).not.toMatch(/Expires=|Max-Age=/i);
    });

    it('manter sessao persiste o cookie e estende a validade no servidor', async () => {
      const api = new ApiClient(ctx.server);
      const res = await api
        .post('/auth/login', {
          email: 'ana@exemplo.com',
          senha: strongPassword,
          manterSessao: true,
        })
        .expect(200);
      expect((res.headers['set-cookie'] as unknown as string[])[0]).toMatch(
        /Expires=/i,
      );

      const session = await ctx.prisma.sessaoUsuario.findFirstOrThrow({
        where: { manterSessao: true },
      });
      const days = (session.expiraEm.getTime() - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(29);
    });

    it('guarda somente o hash do token da sessao', async () => {
      const api = new ApiClient(ctx.server);
      const res = await api.post('/auth/login', {
        email: 'ana@exemplo.com',
        senha: strongPassword,
      });
      const token = sessionCookieFrom(res).split('=')[1];
      const session = await ctx.prisma.sessaoUsuario.findFirstOrThrow();
      expect(session.tokenHash).not.toBe(token);
      expect(session.tokenHash).toHaveLength(64);
    });

    it('CA-004/RN-AUTH-002: senha errada e e-mail inexistente sao indistinguiveis', async () => {
      const wrongPassword = await new ApiClient(ctx.server).post(
        '/auth/login',
        {
          email: 'ana@exemplo.com',
          senha: 'senha errada qualquer',
        },
      );
      const unknownEmail = await new ApiClient(ctx.server).post('/auth/login', {
        email: 'ninguem@exemplo.com',
        senha: 'senha errada qualquer',
      });

      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(wrongPassword.status);
      expect(unknownEmail.body).toEqual(wrongPassword.body);
      expect(wrongPassword.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('CA-002: dados invalidos recebem erro por campo', async () => {
      const res = await new ApiClient(ctx.server).post('/auth/login', {
        email: 'x',
        senha: '',
      });
      expect(res.status).toBe(400);
      expect(res.body.errors.email).toBeDefined();
      expect(res.body.errors.senha).toBeDefined();
    });

    it('RN-AUTH-004: bloqueia apos 5 falhas do mesmo e-mail+IP, inclusive com a senha correta', async () => {
      const api = new ApiClient(ctx.server);
      for (let i = 0; i < 5; i++) {
        await api
          .post('/auth/login', { email: 'ana@exemplo.com', senha: 'errada' })
          .expect(401);
      }
      const blocked = await api.post('/auth/login', {
        email: 'ana@exemplo.com',
        senha: strongPassword,
      });
      expect(blocked.status).toBe(429);
      expect(blocked.body.code).toBe('TOO_MANY_ATTEMPTS');
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('o bloqueio e igual para e-mail existente e inexistente (sem oraculo)', async () => {
      const api = new ApiClient(ctx.server);
      for (let i = 0; i < 5; i++) {
        await api
          .post('/auth/login', {
            email: 'fantasma@exemplo.com',
            senha: 'errada',
          })
          .expect(401);
      }
      const res = await api.post('/auth/login', {
        email: 'fantasma@exemplo.com',
        senha: 'errada',
      });
      expect(res.status).toBe(429);
    });

    it('registra tentativas na auditoria sem gravar senha', async () => {
      const api = new ApiClient(ctx.server);
      await api
        .post('/auth/login', {
          email: 'ana@exemplo.com',
          senha: 'senha-secreta-errada',
        })
        .expect(401);
      await api
        .post('/auth/login', {
          email: 'ana@exemplo.com',
          senha: strongPassword,
        })
        .expect(200);

      const events = await ctx.prisma.eventoAuditoria.findMany({
        where: { acao: 'auth.login' },
        orderBy: { ocorridoEm: 'asc' },
      });
      expect(events.map((e) => e.resultado)).toEqual(['FALHA', 'SUCESSO']);
      expect(events[0].rotaHttp).toBe('/api/auth/login');
      expect(JSON.stringify(events)).not.toContain('senha-secreta-errada');
      expect(JSON.stringify(events)).not.toContain(strongPassword);
    });
  });

  describe('sessao e logout (RN-AUTH-005, RN-AUTH-008, CA-007)', () => {
    let api: ApiClient;
    let cookie: string;

    beforeEach(async () => {
      await registerAndVerify(ctx, 'ana@exemplo.com');
      ctx.limiter.clearAll();
      api = new ApiClient(ctx.server);
      const res = await api
        .post('/auth/login', {
          email: 'ana@exemplo.com',
          senha: strongPassword,
        })
        .expect(200);
      cookie = sessionCookieFrom(res);
    });

    it('sem cookie devolve auth_required (200, nao e erro)', async () => {
      const res = await request(ctx.server).get('/api/auth/session');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'auth_required' });
    });

    it('retorna a sessao autenticada', async () => {
      const res = await api.get('/auth/session').expect(200);
      expect(res.body.status).toBe('authenticated');
    });

    it('logout revoga a sessao no servidor: reutilizar o cookie antigo nao funciona', async () => {
      await api.post('/auth/logout').expect(204);

      const replay = await withCookie(ctx.server, cookie).get('/auth/session');
      expect(replay.body).toEqual({ status: 'auth_required' });
      const session = await ctx.prisma.sessaoUsuario.findFirstOrThrow();
      expect(session.revogadaEm).not.toBeNull();
    });

    it('logout e idempotente sem sessao', async () => {
      await new ApiClient(ctx.server).post('/auth/logout').expect(204);
    });

    it('CA-007: sessao expirada e tratada como nao autenticada', async () => {
      await ctx.prisma.sessaoUsuario.updateMany({
        data: { expiraEm: new Date(Date.now() - 1000) },
      });
      const res = await api.get('/auth/session');
      expect(res.body).toEqual({ status: 'auth_required' });
    });

    it('cada login emite um token novo (fixacao de sessao)', async () => {
      const second = await new ApiClient(ctx.server)
        .post('/auth/login', {
          email: 'ana@exemplo.com',
          senha: strongPassword,
        })
        .expect(200);
      expect(sessionCookieFrom(second)).not.toBe(cookie);
    });

    it('usuario excluido (soft delete) perde o acesso', async () => {
      await ctx.prisma.usuario.updateMany({ data: { excluidoEm: new Date() } });
      const res = await api.get('/auth/session');
      expect(res.body).toEqual({ status: 'auth_required' });
      const login = await new ApiClient(ctx.server).post('/auth/login', {
        email: 'ana@exemplo.com',
        senha: strongPassword,
      });
      expect(login.status).toBe(401);
    });
  });

  describe('auditoria append-only (RF-013)', () => {
    it('o banco impede alterar ou apagar eventos', async () => {
      await register(new ApiClient(ctx.server)).expect(202);
      await expect(
        ctx.prisma.eventoAuditoria.deleteMany({
          where: { acao: 'auth.register' },
        }),
      ).rejects.toThrow();
      await expect(
        ctx.prisma.eventoAuditoria.updateMany({ data: { acao: 'alterada' } }),
      ).rejects.toThrow();
    });
  });
});
