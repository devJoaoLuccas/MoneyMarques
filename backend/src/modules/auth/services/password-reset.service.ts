import { Injectable } from '@nestjs/common';
import { AuthConfig } from '../../../config/auth.config';
import { ApiErrors } from '../../../common/errors/api-exception';
import { ClientInfo } from '../../../common/http/client-info.decorator';
import { RateLimiterService } from '../../../common/security/rate-limiter.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AUTH_LIMITS } from '../auth.limits';
import { AuthMailer } from './auth-mailer.service';
import { EmailVaultService } from './email-vault.service';
import { PasswordHasher } from './password-hasher.service';
import { validatePasswordPolicy } from './password-policy';
import { TokenService } from './token.service';

/** AUTH-003: recuperacao de senha com token de uso unico e curta validade. */
@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly hasher: PasswordHasher,
    private readonly emailVault: EmailVaultService,
    private readonly mailer: AuthMailer,
    private readonly limiter: RateLimiterService,
    private readonly audit: AuditService,
    private readonly config: AuthConfig,
  ) {}

  /**
   * Resposta sempre neutra (CA-013): o chamador nao sabe se a conta existe.
   * Limite por e-mail e silencioso para nao virar oraculo de existencia.
   */
  async requestReset(email: string, client: ClientInfo): Promise<void> {
    const ipKey = `forgot:ip:${client.ip ?? 'desconhecido'}`;
    const ipStatus = this.limiter.check(ipKey, AUTH_LIMITS.forgotIp);
    if (ipStatus.blocked)
      throw ApiErrors.tooManyAttempts(ipStatus.retryAfterSeconds);
    this.limiter.record(ipKey, AUTH_LIMITS.forgotIp.windowMs);

    const emailKey = `forgot:email:${this.tokens.hash(email)}`;
    const emailBlocked = this.limiter.check(
      emailKey,
      AUTH_LIMITS.forgotEmail,
    ).blocked;
    this.limiter.record(emailKey, AUTH_LIMITS.forgotEmail.windowMs);

    const user = await this.prisma.usuario.findUnique({
      where: { emailHmac: this.emailVault.hmac(email) },
      select: { uid: true, excluidoEm: true },
    });

    if (user && !user.excluidoEm && !emailBlocked) {
      const token = this.tokens.generateToken();
      await this.prisma.$transaction([
        this.prisma.tokenAutenticacao.updateMany({
          where: {
            usuarioUid: user.uid,
            tipo: 'REDEFINICAO_SENHA',
            utilizadoEm: null,
          },
          data: { utilizadoEm: new Date() },
        }),
        this.prisma.tokenAutenticacao.create({
          data: {
            usuarioUid: user.uid,
            tipo: 'REDEFINICAO_SENHA',
            tokenHash: this.tokens.hash(token),
            expiraEm: new Date(Date.now() + this.config.passwordResetTtlMs),
          },
        }),
      ]);
      await this.mailer.sendPasswordReset(
        this.emailVault.normalize(email),
        token,
      );
    }

    await this.audit.record({
      acao: 'auth.password.forgot',
      resultado: 'SUCESSO',
      client,
      usuarioUid: user?.uid ?? null,
    });
  }

  async reset(token: string, senha: string, client: ClientInfo): Promise<void> {
    const record = await this.prisma.tokenAutenticacao.findUnique({
      where: { tokenHash: this.tokens.hash(token) },
      include: {
        usuario: {
          select: {
            uid: true,
            emailCriptografado: true,
            nomeCompleto: true,
            excluidoEm: true,
          },
        },
      },
    });

    const usable =
      record &&
      record.tipo === 'REDEFINICAO_SENHA' &&
      !record.utilizadoEm &&
      record.expiraEm.getTime() > Date.now() &&
      !record.usuario.excluidoEm;

    if (!usable) {
      await this.audit.record({
        acao: 'auth.password.reset',
        resultado: 'NEGADO',
        client,
        usuarioUid: record?.usuarioUid,
      });
      throw ApiErrors.invalidToken();
    }

    // Senha fraca nao consome o token: o usuario pode tentar de novo.
    const email = this.emailVault.open(record.usuario.emailCriptografado);
    const problems = validatePasswordPolicy(senha, {
      email,
      nomeCompleto: record.usuario.nomeCompleto,
    });
    if (problems.length > 0) throw ApiErrors.validation({ senha: problems });

    const senhaHash = await this.hasher.hash(senha);
    const now = new Date();

    const consumed = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.tokenAutenticacao.updateMany({
        where: { uid: record.uid, utilizadoEm: null },
        data: { utilizadoEm: now },
      });
      if (claim.count !== 1) return false;

      await tx.usuario.update({
        where: { uid: record.usuarioUid },
        data: { senhaHash },
      });
      // Demais tokens de reset pendentes deixam de valer.
      await tx.tokenAutenticacao.updateMany({
        where: {
          usuarioUid: record.usuarioUid,
          tipo: 'REDEFINICAO_SENHA',
          utilizadoEm: null,
        },
        data: { utilizadoEm: now },
      });
      // CA-015: a nova senha encerra todas as sessoes existentes.
      await tx.sessaoUsuario.updateMany({
        where: { usuarioUid: record.usuarioUid, revogadaEm: null },
        data: { revogadaEm: now },
      });
      return true;
    });

    if (!consumed) throw ApiErrors.invalidToken();

    await this.mailer.sendPasswordChanged(email);
    await this.audit.record({
      acao: 'auth.password.reset',
      resultado: 'SUCESSO',
      client,
      usuarioUid: record.usuarioUid,
    });
  }
}
