import { Injectable } from '@nestjs/common';
import { AuthConfig } from '../../../config/auth.config';
import { ApiErrors } from '../../../common/errors/api-exception';
import { ClientInfo } from '../../../common/http/client-info.decorator';
import { RateLimiterService } from '../../../common/security/rate-limiter.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AUTH_LIMITS } from '../auth.limits';
import { AuthContext } from '../auth.types';
import { AuthMailer } from './auth-mailer.service';
import { TokenService } from './token.service';

interface VerifiableUser {
  uid: string;
  email: string;
  nomeCompleto: string;
}

/** RN-AUTH-009: confirmacao de e-mail por token de uso unico. */
@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly mailer: AuthMailer,
    private readonly limiter: RateLimiterService,
    private readonly audit: AuditService,
    private readonly config: AuthConfig,
  ) {}

  /** Emite um novo token (invalidando os anteriores) e envia o e-mail. */
  async issue(user: VerifiableUser): Promise<void> {
    const token = this.tokens.generateToken();
    await this.prisma.$transaction([
      this.prisma.tokenAutenticacao.updateMany({
        where: {
          usuarioUid: user.uid,
          tipo: 'VERIFICACAO_EMAIL',
          utilizadoEm: null,
        },
        data: { utilizadoEm: new Date() },
      }),
      this.prisma.tokenAutenticacao.create({
        data: {
          usuarioUid: user.uid,
          tipo: 'VERIFICACAO_EMAIL',
          tokenHash: this.tokens.hash(token),
          expiraEm: new Date(Date.now() + this.config.emailVerificationTtlMs),
        },
      }),
    ]);
    await this.mailer.sendEmailVerification(
      user.email,
      user.nomeCompleto,
      token,
    );
  }

  async confirm(token: string, client: ClientInfo): Promise<void> {
    const record = await this.prisma.tokenAutenticacao.findUnique({
      where: { tokenHash: this.tokens.hash(token) },
      select: {
        uid: true,
        usuarioUid: true,
        tipo: true,
        utilizadoEm: true,
        expiraEm: true,
      },
    });

    const usable =
      record &&
      record.tipo === 'VERIFICACAO_EMAIL' &&
      !record.utilizadoEm &&
      record.expiraEm.getTime() > Date.now();

    if (!usable) {
      await this.audit.record({
        acao: 'auth.email.verify',
        resultado: 'NEGADO',
        client,
        usuarioUid: record?.usuarioUid,
      });
      throw ApiErrors.invalidToken();
    }

    // Consumo atomico: apenas uma requisicao consegue usar o token.
    const consumed = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.tokenAutenticacao.updateMany({
        where: { uid: record.uid, utilizadoEm: null },
        data: { utilizadoEm: new Date() },
      });
      if (claim.count !== 1) return false;
      await tx.usuario.updateMany({
        where: { uid: record.usuarioUid, emailVerificadoEm: null },
        data: { emailVerificadoEm: new Date() },
      });
      return true;
    });

    if (!consumed) throw ApiErrors.invalidToken();
    await this.audit.record({
      acao: 'auth.email.verify',
      resultado: 'SUCESSO',
      client,
      usuarioUid: record.usuarioUid,
    });
  }

  /** Reenvio para o usuario autenticado com e-mail pendente. */
  async resend(
    auth: AuthContext,
    client: ClientInfo,
  ): Promise<'sent' | 'already_verified'> {
    if (auth.status !== 'email_verification_required')
      return 'already_verified';

    const key = `email-resend:${auth.usuario.uid}`;
    const status = this.limiter.check(key, AUTH_LIMITS.emailResendUser);
    if (status.blocked)
      throw ApiErrors.tooManyAttempts(status.retryAfterSeconds);
    this.limiter.record(key, AUTH_LIMITS.emailResendUser.windowMs);

    await this.issue(auth.usuario);
    await this.audit.record({
      acao: 'auth.email.resend',
      resultado: 'SUCESSO',
      client,
      usuarioUid: auth.usuario.uid,
      sessaoUid: auth.sessaoUid,
    });
    return 'sent';
  }
}
