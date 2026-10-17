import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';
import { RateLimiterService } from '../../src/common/security/rate-limiter.service';
import { MailMessage, MailPort } from '../../src/modules/mail/mail.port';
import { EmailVaultService } from '../../src/modules/auth/services/email-vault.service';
import { PrismaService } from '../../src/prisma/prisma.service';

/** Caixa de e-mail em memoria: permite ler links/tokens sem SMTP. */
export class InMemoryMailbox extends MailPort {
  readonly messages: MailMessage[] = [];

  send(message: MailMessage): Promise<void> {
    this.messages.push(message);
    return Promise.resolve();
  }

  clear(): void {
    this.messages.length = 0;
  }

  to(address: string): MailMessage[] {
    return this.messages.filter((m) => m.to === address);
  }

  /** Ultimo token enviado (fragmento #token=) para o endereco. */
  lastToken(address: string): string {
    const message = this.to(address).at(-1);
    const match = message?.text.match(/#token=([A-Za-z0-9_-]+)/);
    if (!match) throw new Error(`Nenhum token enviado para ${address}`);
    return match[1];
  }
}

export interface TestContext {
  app: INestApplication<App>;
  prisma: PrismaService;
  limiter: RateLimiterService;
  vault: EmailVaultService;
  mailbox: InMemoryMailbox;
  server: App;
}

export async function createTestContext(): Promise<TestContext> {
  const mailbox = new InMemoryMailbox();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailPort)
    .useValue(mailbox)
    .compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();

  return {
    app,
    prisma: app.get(PrismaService),
    limiter: app.get(RateLimiterService),
    vault: app.get(EmailVaultService),
    mailbox,
    server: app.getHttpServer(),
  };
}

/** Limpa dados entre testes. TRUNCATE nao dispara o trigger append-only da auditoria. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE usuario, familia, instituicao_financeira, classe_ativo RESTART IDENTITY CASCADE',
  );
}

/** Cliente HTTP com cookie jar e o header anti-CSRF aplicado em escritas. */
export class ApiClient {
  private readonly agent: ReturnType<typeof request.agent>;

  constructor(server: App) {
    this.agent = request.agent(server);
  }

  get(path: string) {
    return this.agent.get(`/api${path}`);
  }

  post(path: string, body?: object) {
    return this.agent
      .post(`/api${path}`)
      .set('X-CSRF-Protection', '1')
      .send(body ?? {});
  }
}

/** Par nome=valor do cookie de sessao a partir de uma resposta com Set-Cookie. */
export function sessionCookieFrom(response: {
  headers: Record<string, unknown>;
}): string {
  const header = response.headers['set-cookie'] as string[] | undefined;
  const cookie = header?.find((c) => c.startsWith('mm_session='));
  if (!cookie) throw new Error('Resposta sem cookie de sessao');
  return cookie.split(';')[0];
}

/** Requisicao avulsa (sem cookie jar) com um cookie especifico: usada em testes de replay. */
export function withCookie(server: App, cookie: string) {
  return {
    get: (path: string) =>
      request(server).get(`/api${path}`).set('Cookie', cookie),
    post: (path: string, body: object = {}) =>
      request(server)
        .post(`/api${path}`)
        .set('Cookie', cookie)
        .set('X-CSRF-Protection', '1')
        .send(body),
  };
}

export const strongPassword = 'Frase-Longa-Segura-2026';

export async function registerAndVerify(
  ctx: TestContext,
  email: string,
  options: { nome?: string; senha?: string } = {},
): Promise<void> {
  const api = new ApiClient(ctx.server);
  await api
    .post('/auth/register', {
      nomeCompleto: options.nome ?? 'Ana Teste',
      email,
      senha: options.senha ?? strongPassword,
      aceiteTermos: true,
    })
    .expect(202);
  await api
    .post('/auth/email/verify', { token: ctx.mailbox.lastToken(email) })
    .expect(200);
}
