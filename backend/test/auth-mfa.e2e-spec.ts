import { TotpService } from '../src/modules/auth/services/totp.service';
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

/** RF-014 | AUTH-004 | CA-017..CA-020, RN-AUTH-008, RN-AUTH-011 */
describe('Autenticacao: MFA TOTP e codigos de recuperacao (e2e)', () => {
  let ctx: TestContext;
  const totp = new TotpService();
  const email = 'ana@exemplo.com';

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
    ctx.limiter.clearAll();
  });

  const login = (api = new ApiClient(ctx.server)) =>
    api.post('/auth/login', { email, senha: strongPassword });

  /** Codigo de um passo posterior ao ultimo aceito (a janela tolera +1 passo). */
  const nextCode = (secret: string, stepsAhead = 1) =>
    totp.codeForStep(secret, totp.stepAt(Date.now()) + stepsAhead);

  /** Usuario logado com MFA ativo; devolve segredo e codigos de recuperacao. */
  async function enrollMfa() {
    const api = new ApiClient(ctx.server);
    await login(api).expect(200);
    const setup = await api.post('/auth/mfa/setup').expect(200);
    const secret: string = setup.body.secret;
    const enable = await api
      .post('/auth/mfa/enable', {
        codigo: totp.codeForStep(secret, totp.stepAt(Date.now())),
      })
      .expect(200);
    await api.post('/auth/logout').expect(204);
    ctx.limiter.clearAll();
    return { secret, recoveryCodes: enable.body.recoveryCodes as string[] };
  }

  describe('configuracao', () => {
    it('exige sessao autenticada', async () => {
      const res = await new ApiClient(ctx.server).post('/auth/mfa/setup');
      expect(res.status).toBe(401);
    });

    it('setup devolve segredo e URI otpauth; o banco guarda o segredo criptografado', async () => {
      const api = new ApiClient(ctx.server);
      await login(api).expect(200);
      const res = await api.post('/auth/mfa/setup').expect(200);

      expect(res.body.secret).toMatch(/^[A-Z2-7]{32}$/);
      expect(res.body.otpauthUri).toContain('otpauth://totp/');
      expect(res.body.otpauthUri).toContain(encodeURIComponent(email));

      const stored = await ctx.prisma.configuracaoMfa.findFirstOrThrow();
      expect(stored.habilitado).toBe(false);
      expect(stored.segredoCriptografado).not.toContain(res.body.secret);
    });

    it('enable com codigo errado falha e nao ativa o MFA', async () => {
      const api = new ApiClient(ctx.server);
      await login(api).expect(200);
      await api.post('/auth/mfa/setup').expect(200);

      const res = await api.post('/auth/mfa/enable', { codigo: '000000' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_MFA_CODE');
      expect(
        (await ctx.prisma.configuracaoMfa.findFirstOrThrow()).habilitado,
      ).toBe(false);
    });

    it('enable sem setup previo retorna conflito', async () => {
      const api = new ApiClient(ctx.server);
      await login(api).expect(200);
      const res = await api.post('/auth/mfa/enable', { codigo: '123456' });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('MFA_NOT_CONFIGURED');
    });

    it('ativa, entrega 10 codigos de recuperacao so uma vez e guarda apenas os hashes', async () => {
      const api = new ApiClient(ctx.server);
      await login(api).expect(200);
      const { body: setup } = await api.post('/auth/mfa/setup').expect(200);
      const res = await api
        .post('/auth/mfa/enable', {
          codigo: totp.codeForStep(setup.secret, totp.stepAt(Date.now())),
        })
        .expect(200);

      expect(res.body.recoveryCodes).toHaveLength(10);
      expect(new Set(res.body.recoveryCodes).size).toBe(10);
      const stored = await ctx.prisma.codigoRecuperacaoMfa.findMany();
      expect(stored).toHaveLength(10);
      for (const code of res.body.recoveryCodes as string[]) {
        expect(stored.some((s) => s.codigoHash.includes(code))).toBe(false);
      }

      // A propria sessao que ativou continua autenticada...
      expect((await api.get('/auth/session')).body.status).toBe(
        'authenticated',
      );
      // ...e nao e possivel refazer o setup com o MFA ja ativo (segredo nao reexibido).
      expect((await api.post('/auth/mfa/setup')).status).toBe(409);
    });
  });

  describe('desafio no login (AUTH-004)', () => {
    it('CA-017: com MFA ativo o login deixa a sessao pendente e sem acesso a dados privados', async () => {
      await enrollMfa();
      const api = new ApiClient(ctx.server);
      const res = await login(api).expect(200);

      expect(res.body.status).toBe('mfa_required');
      expect(res.body.usuario).toEqual({ email });
      expect(res.body.contexto).toBeUndefined();

      const privateRoute = await api.post('/auth/mfa/setup');
      expect(privateRoute.status).toBe(403);
      expect(privateRoute.body.code).toBe('MFA_REQUIRED');
    });

    it('CA-018: codigo valido conclui o desafio e troca o token da sessao (RN-AUTH-008)', async () => {
      const { secret } = await enrollMfa();
      const api = new ApiClient(ctx.server);
      const pending = await login(api).expect(200);
      const pendingCookie = sessionCookieFrom(pending);

      const res = await api.post('/auth/mfa/verify', {
        codigo: nextCode(secret),
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('authenticated');
      expect(res.body.contexto.tipo).toBe('sem_familia');

      const newCookie = sessionCookieFrom(res);
      expect(newCookie).not.toBe(pendingCookie);
      // O token pre-MFA foi revogado.
      expect(
        (await withCookie(ctx.server, pendingCookie).get('/auth/session')).body,
      ).toEqual({
        status: 'auth_required',
      });
      expect(
        (await withCookie(ctx.server, newCookie).get('/auth/session')).body
          .status,
      ).toBe('authenticated');
    });

    it('CA-019: codigo invalido e recusado', async () => {
      await enrollMfa();
      const api = new ApiClient(ctx.server);
      await login(api).expect(200);
      const res = await api.post('/auth/mfa/verify', { codigo: '000000' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_MFA_CODE');
    });

    it('CA-019: replay do mesmo codigo TOTP e recusado', async () => {
      const { secret } = await enrollMfa();
      const code = nextCode(secret);

      const first = new ApiClient(ctx.server);
      await login(first).expect(200);
      await first.post('/auth/mfa/verify', { codigo: code }).expect(200);

      const second = new ApiClient(ctx.server);
      await login(second).expect(200);
      const replay = await second.post('/auth/mfa/verify', { codigo: code });
      expect(replay.status).toBe(401);
    });

    it('codigo que ja foi usado na ativacao nao serve de novo (mesmo passo)', async () => {
      const api = new ApiClient(ctx.server);
      await login(api).expect(200);
      const { body: setup } = await api.post('/auth/mfa/setup').expect(200);
      const code = totp.codeForStep(setup.secret, totp.stepAt(Date.now()));
      await api.post('/auth/mfa/enable', { codigo: code }).expect(200);
      await api.post('/auth/logout').expect(204);

      const again = new ApiClient(ctx.server);
      await login(again).expect(200);
      expect(
        (await again.post('/auth/mfa/verify', { codigo: code })).status,
      ).toBe(401);
    });

    it('CA-019: limita tentativas e bloqueia mesmo o codigo correto', async () => {
      const { secret } = await enrollMfa();
      const api = new ApiClient(ctx.server);
      await login(api).expect(200);
      for (let i = 0; i < 5; i++) {
        await api.post('/auth/mfa/verify', { codigo: '000000' }).expect(401);
      }
      const blocked = await api.post('/auth/mfa/verify', {
        codigo: nextCode(secret),
      });
      expect(blocked.status).toBe(429);
      expect(blocked.body.code).toBe('TOO_MANY_ATTEMPTS');
    });

    it('exige informar um codigo', async () => {
      await enrollMfa();
      const api = new ApiClient(ctx.server);
      await login(api).expect(200);
      const res = await api.post('/auth/mfa/verify', {});
      expect(res.status).toBe(400);
      expect(res.body.errors.codigo).toBeDefined();
    });
  });

  describe('codigos de recuperacao (CA-020)', () => {
    it('conclui o desafio uma unica vez por codigo, aceitando caixa e hifen livres', async () => {
      const { recoveryCodes } = await enrollMfa();
      const code = recoveryCodes[0];

      const first = new ApiClient(ctx.server);
      await login(first).expect(200);
      const ok = await first.post('/auth/mfa/verify', {
        codigoRecuperacao: ` ${code.toLowerCase().replace('-', ' ')} `,
      });
      expect(ok.status).toBe(200);
      expect(ok.body.status).toBe('authenticated');

      const second = new ApiClient(ctx.server);
      await login(second).expect(200);
      const reuse = await second.post('/auth/mfa/verify', {
        codigoRecuperacao: code,
      });
      expect(reuse.status).toBe(401);
    });

    it('o uso fica auditado como recuperacao', async () => {
      const { recoveryCodes } = await enrollMfa();
      const api = new ApiClient(ctx.server);
      await login(api).expect(200);
      await api
        .post('/auth/mfa/verify', { codigoRecuperacao: recoveryCodes[1] })
        .expect(200);

      const event = await ctx.prisma.eventoAuditoria.findFirst({
        where: { acao: 'auth.mfa.recovery_used' },
      });
      expect(event?.resultado).toBe('SUCESSO');
      expect(
        JSON.stringify(await ctx.prisma.eventoAuditoria.findMany()),
      ).not.toContain(recoveryCodes[1]);
    });

    it('reenrolamento: desativar exige senha e segundo fator, apaga segredo e codigos e encerra outras sessoes', async () => {
      const { recoveryCodes } = await enrollMfa();
      const other = new ApiClient(ctx.server);
      const pending = await login(other).expect(200);
      const otherCookie = sessionCookieFrom(pending);

      const api = new ApiClient(ctx.server);
      await login(api).expect(200);
      await api
        .post('/auth/mfa/verify', { codigoRecuperacao: recoveryCodes[2] })
        .expect(200);

      const wrongPassword = await api.post('/auth/mfa/disable', {
        senha: 'senha errada',
        codigoRecuperacao: recoveryCodes[3],
      });
      expect(wrongPassword.status).toBe(400);
      expect((await ctx.prisma.configuracaoMfa.count()) + 0).toBe(1);

      await api
        .post('/auth/mfa/disable', {
          senha: strongPassword,
          codigoRecuperacao: recoveryCodes[3],
        })
        .expect(200);

      expect(await ctx.prisma.configuracaoMfa.count()).toBe(0);
      expect(await ctx.prisma.codigoRecuperacaoMfa.count()).toBe(0);
      expect(
        (await withCookie(ctx.server, otherCookie).get('/auth/session')).body
          .status,
      ).toBe('auth_required');
      // A sessao atual continua valida e ja pode refazer o enrolamento.
      expect((await api.get('/auth/session')).body.status).toBe(
        'authenticated',
      );
      await api.post('/auth/mfa/setup').expect(200);
    });
  });
});
