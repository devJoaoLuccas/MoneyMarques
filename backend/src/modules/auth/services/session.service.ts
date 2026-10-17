import { Injectable } from '@nestjs/common';
import { AuthConfig } from '../../../config/auth.config';
import { ClientInfo } from '../../../common/http/client-info.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthContext } from '../auth.types';
import { deriveAuthStatus } from './session-status';
import { EmailVaultService } from './email-vault.service';
import { TokenService } from './token.service';

const ACTIVITY_TOUCH_INTERVAL_MS = 60_000;

export interface IssuedSession {
  /** Valor em claro, entregue apenas ao cookie; no banco fica so o hash. */
  token: string;
  uid: string;
  expiraEm: Date;
  persistent: boolean;
}

export interface CreateSessionInput {
  usuarioUid: string;
  mfaVerificado: boolean;
  manterSessao: boolean;
  client: ClientInfo;
}

/** Ciclo de vida das sessoes no servidor (revogacao real, RN-AUTH-005). */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly config: AuthConfig,
    private readonly emailVault: EmailVaultService,
  ) {}

  /** Sempre emite um token novo: nunca reaproveita identificador (RN-AUTH-008). */
  async create(input: CreateSessionInput): Promise<IssuedSession> {
    const token = this.tokens.generateToken();
    const ttl = input.manterSessao
      ? this.config.rememberSessionTtlMs
      : this.config.sessionTtlMs;
    const expiraEm = new Date(Date.now() + ttl);

    const session = await this.prisma.sessaoUsuario.create({
      data: {
        usuarioUid: input.usuarioUid,
        tokenHash: this.tokens.hash(token),
        mfaVerificado: input.mfaVerificado,
        manterSessao: input.manterSessao,
        ipCriacao: input.client.ip,
        userAgent: input.client.userAgent,
        ultimaAtividadeEm: new Date(),
        expiraEm,
      },
      select: { uid: true },
    });

    return {
      token,
      uid: session.uid,
      expiraEm,
      persistent: input.manterSessao,
    };
  }

  /** Resolve o token do cookie em contexto autenticado; null se invalido/expirado/revogado. */
  async resolve(token: string): Promise<AuthContext | null> {
    const session = await this.prisma.sessaoUsuario.findUnique({
      where: { tokenHash: this.tokens.hash(token) },
      include: {
        usuario: {
          select: {
            uid: true,
            nomeCompleto: true,
            emailCriptografado: true,
            emailVerificadoEm: true,
            excluidoEm: true,
            configuracaoMfa: { select: { habilitado: true } },
          },
        },
      },
    });

    const now = Date.now();
    if (
      !session ||
      session.revogadaEm ||
      session.expiraEm.getTime() <= now ||
      session.usuario.excluidoEm
    ) {
      return null;
    }

    if (
      !session.ultimaAtividadeEm ||
      now - session.ultimaAtividadeEm.getTime() > ACTIVITY_TOUCH_INTERVAL_MS
    ) {
      await this.prisma.sessaoUsuario.update({
        where: { uid: session.uid },
        data: { ultimaAtividadeEm: new Date(now) },
      });
    }

    const mfaHabilitado = session.usuario.configuracaoMfa?.habilitado ?? false;
    return {
      sessaoUid: session.uid,
      manterSessao: session.manterSessao,
      mfaHabilitado,
      status: deriveAuthStatus({
        emailVerificado: session.usuario.emailVerificadoEm !== null,
        mfaHabilitado,
        mfaVerificado: session.mfaVerificado,
      }),
      usuario: {
        uid: session.usuario.uid,
        nomeCompleto: session.usuario.nomeCompleto,
        email: this.emailVault.open(session.usuario.emailCriptografado),
      },
    };
  }

  async revokeByToken(token: string): Promise<string | null> {
    const session = await this.prisma.sessaoUsuario.findUnique({
      where: { tokenHash: this.tokens.hash(token) },
      select: { uid: true, usuarioUid: true, revogadaEm: true },
    });
    if (!session) return null;
    if (!session.revogadaEm) await this.revoke(session.uid);
    return session.usuarioUid;
  }

  async revoke(sessaoUid: string): Promise<void> {
    await this.prisma.sessaoUsuario.updateMany({
      where: { uid: sessaoUid, revogadaEm: null },
      data: { revogadaEm: new Date() },
    });
  }

  async revokeAllForUser(
    usuarioUid: string,
    exceptSessaoUid?: string,
  ): Promise<void> {
    await this.prisma.sessaoUsuario.updateMany({
      where: {
        usuarioUid,
        revogadaEm: null,
        ...(exceptSessaoUid ? { uid: { not: exceptSessaoUid } } : {}),
      },
      data: { revogadaEm: new Date() },
    });
  }

  /**
   * Troca o token apos elevacao de privilegio (ex.: MFA concluido), revogando
   * o anterior e preservando as preferencias da sessao.
   */
  async rotate(
    current: Pick<AuthContext, 'sessaoUid' | 'manterSessao' | 'usuario'>,
    client: ClientInfo,
    options: { mfaVerificado: boolean },
  ): Promise<IssuedSession> {
    const issued = await this.create({
      usuarioUid: current.usuario.uid,
      mfaVerificado: options.mfaVerificado,
      manterSessao: current.manterSessao,
      client,
    });
    await this.revoke(current.sessaoUid);
    return issued;
  }

  async markMfaVerified(sessaoUid: string): Promise<void> {
    await this.prisma.sessaoUsuario.update({
      where: { uid: sessaoUid },
      data: { mfaVerificado: true },
    });
  }
}
