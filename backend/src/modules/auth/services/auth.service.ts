import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { ApiErrors } from '../../../common/errors/api-exception';
import { ClientInfo } from '../../../common/http/client-info.decorator';
import {
  RateLimiterService,
  RateLimitRule,
} from '../../../common/security/rate-limiter.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AUTH_LIMITS } from '../auth.limits';
import { LoginDto, RegisterDto } from '../dto/auth.dto';
import { SessionView } from '../auth.types';
import { AuthMailer } from './auth-mailer.service';
import { EmailVaultService } from './email-vault.service';
import { EmailVerificationService } from './email-verification.service';
import { PasswordHasher } from './password-hasher.service';
import { validatePasswordPolicy } from './password-policy';
import { SessionViewService } from './session-view.service';
import { IssuedSession, SessionService } from './session.service';
import { TokenService } from './token.service';

export interface LoginResult {
  session: IssuedSession;
  view: SessionView;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly emailVault: EmailVaultService,
    private readonly sessions: SessionService,
    private readonly views: SessionViewService,
    private readonly emailVerification: EmailVerificationService,
    private readonly mailer: AuthMailer,
    private readonly limiter: RateLimiterService,
    private readonly audit: AuditService,
  ) {}

  /**
   * AUTH-002. A resposta e identica para e-mail novo ou ja cadastrado
   * (CA-009): quem ja tem conta e avisado por e-mail, nunca na tela.
   */
  async register(dto: RegisterDto, client: ClientInfo): Promise<void> {
    const ipKey = `register:ip:${client.ip ?? 'desconhecido'}`;
    const ipStatus = this.limiter.check(ipKey, AUTH_LIMITS.registerIp);
    if (ipStatus.blocked)
      throw ApiErrors.tooManyAttempts(ipStatus.retryAfterSeconds);
    this.limiter.record(ipKey, AUTH_LIMITS.registerIp.windowMs);

    const problems = validatePasswordPolicy(dto.senha, {
      email: dto.email,
      nomeCompleto: dto.nomeCompleto,
    });
    if (problems.length > 0) throw ApiErrors.validation({ senha: problems });

    // O hash e calculado sempre, para que o tempo nao revele e-mail ja cadastrado.
    const senhaHash = await this.hasher.hash(dto.senha);

    const emailKey = `register:email:${this.tokens.hash(dto.email)}`;
    const emailLimited = this.limiter.check(
      emailKey,
      AUTH_LIMITS.registerEmail,
    ).blocked;
    this.limiter.record(emailKey, AUTH_LIMITS.registerEmail.windowMs);

    const sealedEmail = this.emailVault.seal(dto.email);
    const existing = await this.prisma.usuario.findUnique({
      where: { emailHmac: sealedEmail.emailHmac },
      select: { uid: true },
    });
    if (existing) {
      await this.handleDuplicateRegistration(dto.email, emailLimited, client);
      return;
    }

    let user: { uid: string; nomeCompleto: string };
    try {
      user = await this.prisma.usuario.create({
        data: {
          nomeCompleto: dto.nomeCompleto,
          ...sealedEmail,
          senhaHash,
          preferencias: { create: {} },
        },
        select: { uid: true, nomeCompleto: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Corrida entre dois cadastros do mesmo e-mail.
        await this.handleDuplicateRegistration(dto.email, emailLimited, client);
        return;
      }
      throw error;
    }

    if (!emailLimited) {
      await this.emailVerification.issue({ ...user, email: dto.email });
    }
    await this.audit.record({
      acao: 'auth.register',
      resultado: 'SUCESSO',
      client,
      usuarioUid: user.uid,
      // Registro do aceite (a necessidade de tabela propria de consentimentos
      // esta pendente de validacao juridica; ver autenticacao.md).
      metadados: { termosAceitos: true },
    });
  }

  /** AUTH-001. */
  async login(dto: LoginDto, client: ClientInfo): Promise<LoginResult> {
    const keys = this.loginKeys(dto.email, client);
    const blocked = keys
      .map(({ key, rule }) => this.limiter.check(key, rule))
      .filter((status) => status.blocked);
    if (blocked.length > 0) {
      throw ApiErrors.tooManyAttempts(
        Math.max(...blocked.map((s) => s.retryAfterSeconds)),
      );
    }

    const user = await this.prisma.usuario.findUnique({
      where: { emailHmac: this.emailVault.hmac(dto.email) },
      select: { uid: true, senhaHash: true, excluidoEm: true },
    });

    let valid = false;
    if (user && !user.excluidoEm) {
      valid = await this.hasher.verify(user.senhaHash, dto.senha);
    } else {
      await this.hasher.burn(dto.senha);
    }

    if (!user || !valid) {
      keys.forEach(({ key, rule }) => this.limiter.record(key, rule.windowMs));
      await this.audit.record({
        acao: 'auth.login',
        resultado: 'FALHA',
        client,
        usuarioUid: user?.uid ?? null,
        codigoHttp: 401,
      });
      throw ApiErrors.invalidCredentials();
    }

    // O contador do par e-mail+IP zera no sucesso; os demais seguem acumulando.
    this.limiter.clear(keys[0].key);

    const session = await this.sessions.create({
      usuarioUid: user.uid,
      mfaVerificado: false,
      manterSessao: dto.manterSessao ?? false,
      client,
    });
    const auth = await this.sessions.resolve(session.token);

    await this.audit.record({
      acao: 'auth.login',
      resultado: 'SUCESSO',
      client,
      usuarioUid: user.uid,
      sessaoUid: session.uid,
      metadados: { estado: auth?.status ?? 'desconhecido' },
    });

    return { session, view: await this.views.build(auth) };
  }

  /** Encerra a sessao no servidor (revogacao real). Idempotente. */
  async logout(token: string | undefined, client: ClientInfo): Promise<void> {
    if (!token) return;
    const usuarioUid = await this.sessions.revokeByToken(token);
    if (usuarioUid) {
      await this.audit.record({
        acao: 'auth.logout',
        resultado: 'SUCESSO',
        client,
        usuarioUid,
      });
    }
  }

  private async handleDuplicateRegistration(
    email: string,
    limited: boolean,
    client: ClientInfo,
  ): Promise<void> {
    if (!limited) await this.mailer.sendAccountAlreadyExists(email);
    await this.audit.record({
      acao: 'auth.register',
      resultado: 'NEGADO',
      client,
      metadados: { motivo: 'email_ja_cadastrado' },
    });
  }

  private loginKeys(
    email: string,
    client: ClientInfo,
  ): { key: string; rule: RateLimitRule }[] {
    const ip = client.ip ?? 'desconhecido';
    const emailHash = this.tokens.hash(email);
    return [
      { key: `login:pair:${emailHash}:${ip}`, rule: AUTH_LIMITS.loginPair },
      { key: `login:email:${emailHash}`, rule: AUTH_LIMITS.loginEmail },
      { key: `login:ip:${ip}`, rule: AUTH_LIMITS.loginIp },
    ];
  }
}
