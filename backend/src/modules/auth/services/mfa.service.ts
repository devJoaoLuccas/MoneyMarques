import { Injectable } from '@nestjs/common';
import { AuthConfig } from '../../../config/auth.config';
import { ApiErrors } from '../../../common/errors/api-exception';
import { ClientInfo } from '../../../common/http/client-info.decorator';
import { RateLimiterService } from '../../../common/security/rate-limiter.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AUTH_LIMITS } from '../auth.limits';
import { AuthContext } from '../auth.types';
import { MfaCodeDto, MfaDisableDto } from '../dto/auth.dto';
import { MfaSecretCipher } from './mfa-secret-cipher.service';
import { PasswordHasher } from './password-hasher.service';
import { IssuedSession, SessionService } from './session.service';
import { TokenService } from './token.service';
import { TotpService } from './totp.service';

const RECOVERY_CODE_COUNT = 10;

type SecondFactorMethod = 'totp' | 'recuperacao';

export interface MfaSetupResult {
  /** Exibido uma unica vez, apenas durante a configuracao inicial. */
  secret: string;
  otpauthUri: string;
}

/** AUTH-004 / RF-014: TOTP, codigos de recuperacao e reenrolamento. */
@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly totp: TotpService,
    private readonly cipher: MfaSecretCipher,
    private readonly tokens: TokenService,
    private readonly sessions: SessionService,
    private readonly hasher: PasswordHasher,
    private readonly limiter: RateLimiterService,
    private readonly audit: AuditService,
    private readonly config: AuthConfig,
  ) {}

  async startSetup(
    auth: AuthContext,
    client: ClientInfo,
  ): Promise<MfaSetupResult> {
    const existing = await this.prisma.configuracaoMfa.findUnique({
      where: { usuarioUid: auth.usuario.uid },
      select: { habilitado: true },
    });
    if (existing?.habilitado) throw ApiErrors.mfaAlreadyEnabled();

    const secret = this.totp.generateSecret();
    const segredoCriptografado = this.cipher.encrypt(secret);
    await this.prisma.configuracaoMfa.upsert({
      where: { usuarioUid: auth.usuario.uid },
      create: { usuarioUid: auth.usuario.uid, segredoCriptografado },
      update: { segredoCriptografado, ultimoPassoTotp: null },
    });

    await this.audit.record({
      acao: 'auth.mfa.setup',
      resultado: 'SUCESSO',
      client,
      usuarioUid: auth.usuario.uid,
      sessaoUid: auth.sessaoUid,
    });

    return {
      secret,
      otpauthUri: this.totp.buildOtpauthUri({
        secret,
        accountName: auth.usuario.email,
        issuer: this.config.mfaIssuer,
      }),
    };
  }

  /** Confirma o primeiro codigo, ativa o MFA e devolve os codigos de recuperacao (uma unica vez). */
  async enable(
    auth: AuthContext,
    codigo: string,
    client: ClientInfo,
  ): Promise<{ recoveryCodes: string[] }> {
    const config = await this.prisma.configuracaoMfa.findUnique({
      where: { usuarioUid: auth.usuario.uid },
    });
    if (!config) throw ApiErrors.mfaNotConfigured();
    if (config.habilitado) throw ApiErrors.mfaAlreadyEnabled();

    this.assertNotRateLimited(auth.usuario.uid);
    const verification = this.totp.verify(
      this.cipher.decrypt(config.segredoCriptografado),
      codigo,
    );
    if (!verification.valid || verification.step === undefined) {
      await this.failSecondFactor(auth, client, 'auth.mfa.enable');
      throw ApiErrors.invalidMfaCode();
    }

    const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
      this.tokens.generateRecoveryCode(),
    );
    await this.prisma.$transaction([
      this.prisma.configuracaoMfa.update({
        where: { usuarioUid: auth.usuario.uid },
        data: {
          habilitado: true,
          habilitadoEm: new Date(),
          ultimoPassoTotp: BigInt(verification.step),
        },
      }),
      this.prisma.codigoRecuperacaoMfa.deleteMany({
        where: { usuarioUid: auth.usuario.uid },
      }),
      this.prisma.codigoRecuperacaoMfa.createMany({
        data: recoveryCodes.map((code) => ({
          usuarioUid: auth.usuario.uid,
          codigoHash: this.tokens.hashRecoveryCode(code),
        })),
      }),
    ]);
    // Quem acabou de provar o segundo fator nao precisa repeti-lo nesta sessao.
    await this.sessions.markMfaVerified(auth.sessaoUid);
    this.limiter.clear(this.limitKey(auth.usuario.uid));

    await this.audit.record({
      acao: 'auth.mfa.enable',
      resultado: 'SUCESSO',
      client,
      usuarioUid: auth.usuario.uid,
      sessaoUid: auth.sessaoUid,
    });
    return { recoveryCodes };
  }

  /**
   * Conclui o desafio da sessao com MFA pendente. Troca o token da sessao
   * (RN-AUTH-008). Retorna null se a sessao ja estava completa.
   */
  async completeChallenge(
    auth: AuthContext,
    input: MfaCodeDto,
    client: ClientInfo,
  ): Promise<IssuedSession | null> {
    if (auth.status === 'email_verification_required') {
      throw ApiErrors.emailVerificationRequired();
    }
    if (auth.status === 'authenticated') return null;

    const method = await this.checkSecondFactor(
      auth,
      input,
      client,
      'auth.mfa.verify',
    );
    const session = await this.sessions.rotate(auth, client, {
      mfaVerificado: true,
    });

    await this.audit.record({
      acao:
        method === 'recuperacao' ? 'auth.mfa.recovery_used' : 'auth.mfa.verify',
      resultado: 'SUCESSO',
      client,
      usuarioUid: auth.usuario.uid,
      sessaoUid: session.uid,
      metadados: { metodo: method },
    });
    return session;
  }

  /** Reenrolamento seguro (CA-020): exige senha + segundo fator e encerra as outras sessoes. */
  async disable(
    auth: AuthContext,
    input: MfaDisableDto,
    client: ClientInfo,
  ): Promise<void> {
    const user = await this.prisma.usuario.findUniqueOrThrow({
      where: { uid: auth.usuario.uid },
      select: { senhaHash: true },
    });
    this.assertNotRateLimited(auth.usuario.uid);
    if (!(await this.hasher.verify(user.senhaHash, input.senha))) {
      await this.failSecondFactor(auth, client, 'auth.mfa.disable');
      throw ApiErrors.validation({ senha: ['Senha incorreta.'] });
    }

    await this.checkSecondFactor(auth, input, client, 'auth.mfa.disable');

    await this.prisma.$transaction([
      this.prisma.configuracaoMfa.deleteMany({
        where: { usuarioUid: auth.usuario.uid },
      }),
      this.prisma.codigoRecuperacaoMfa.deleteMany({
        where: { usuarioUid: auth.usuario.uid },
      }),
    ]);
    await this.sessions.revokeAllForUser(auth.usuario.uid, auth.sessaoUid);

    await this.audit.record({
      acao: 'auth.mfa.disable',
      resultado: 'SUCESSO',
      client,
      usuarioUid: auth.usuario.uid,
      sessaoUid: auth.sessaoUid,
    });
  }

  /** Valida TOTP ou codigo de recuperacao, com limite de tentativas e protecao contra replay. */
  private async checkSecondFactor(
    auth: AuthContext,
    input: MfaCodeDto,
    client: ClientInfo,
    acao: string,
  ): Promise<SecondFactorMethod> {
    if (!input.codigo && !input.codigoRecuperacao) {
      throw ApiErrors.validation({
        codigo: ['Informe o código de verificação.'],
      });
    }
    this.assertNotRateLimited(auth.usuario.uid);

    const method = input.codigo
      ? await this.checkTotp(auth.usuario.uid, input.codigo)
      : await this.checkRecoveryCode(
          auth.usuario.uid,
          input.codigoRecuperacao!,
        );

    if (!method) {
      await this.failSecondFactor(auth, client, acao);
      throw ApiErrors.invalidMfaCode();
    }
    this.limiter.clear(this.limitKey(auth.usuario.uid));
    return method;
  }

  private async checkTotp(
    usuarioUid: string,
    codigo: string,
  ): Promise<SecondFactorMethod | null> {
    const config = await this.prisma.configuracaoMfa.findUnique({
      where: { usuarioUid },
    });
    if (!config?.habilitado) return null;

    const verification = this.totp.verify(
      this.cipher.decrypt(config.segredoCriptografado),
      codigo,
    );
    if (!verification.valid || verification.step === undefined) return null;

    // Replay: o passo precisa ser maior que o ultimo aceito (atomico no banco).
    const claim = await this.prisma.configuracaoMfa.updateMany({
      where: {
        usuarioUid,
        habilitado: true,
        OR: [
          { ultimoPassoTotp: null },
          { ultimoPassoTotp: { lt: BigInt(verification.step) } },
        ],
      },
      data: { ultimoPassoTotp: BigInt(verification.step) },
    });
    return claim.count === 1 ? 'totp' : null;
  }

  private async checkRecoveryCode(
    usuarioUid: string,
    codigo: string,
  ): Promise<SecondFactorMethod | null> {
    const claim = await this.prisma.codigoRecuperacaoMfa.updateMany({
      where: {
        usuarioUid,
        codigoHash: this.tokens.hashRecoveryCode(codigo),
        utilizadoEm: null,
      },
      data: { utilizadoEm: new Date() },
    });
    return claim.count === 1 ? 'recuperacao' : null;
  }

  private limitKey(usuarioUid: string): string {
    return `mfa:${usuarioUid}`;
  }

  private assertNotRateLimited(usuarioUid: string): void {
    const status = this.limiter.check(
      this.limitKey(usuarioUid),
      AUTH_LIMITS.mfaUser,
    );
    if (status.blocked)
      throw ApiErrors.tooManyAttempts(status.retryAfterSeconds);
  }

  private async failSecondFactor(
    auth: AuthContext,
    client: ClientInfo,
    acao: string,
  ): Promise<void> {
    this.limiter.record(
      this.limitKey(auth.usuario.uid),
      AUTH_LIMITS.mfaUser.windowMs,
    );
    await this.audit.record({
      acao,
      resultado: 'FALHA',
      client,
      usuarioUid: auth.usuario.uid,
      sessaoUid: auth.sessaoUid,
      codigoHttp: 401,
    });
  }
}
