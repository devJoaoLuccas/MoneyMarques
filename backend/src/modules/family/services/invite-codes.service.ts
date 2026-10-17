import { Injectable } from '@nestjs/common';
import { ApiErrors } from '../../../common/errors/api-exception';
import { ClientInfo } from '../../../common/http/client-info.decorator';
import { RateLimiterService } from '../../../common/security/rate-limiter.service';
import type { Prisma } from '../../../generated/prisma/client';
import {
  PapelFamilia,
  SituacaoCodigoConvite,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthContext } from '../../auth/auth.types';
import { TokenService } from '../../auth/services/token.service';
import { AesGcmCipher } from '../../../common/security/aes-gcm.cipher';
import { AuthConfig } from '../../../config/auth.config';
import {
  generateInviteCode,
  isWellFormedInviteCode,
  normalizeInviteCode,
} from '../domain/invite-code';
import { IssueInviteCodeDto } from '../dto/family.dto';
import { FAMILY_LIMITS, INVITE_CODE_TTL_MS } from '../family.constants';
import { FamilyScope } from '../guards/family-context.guard';

export interface InviteCodeView {
  uid: string;
  papel: PapelFamilia;
  situacao: SituacaoCodigoConvite;
  expiraEm: Date;
  criadoEm: Date;
  usadoEm: Date | null;
}

/** O codigo em claro so existe nesta resposta; depois so resta o HMAC. */
export interface IssuedInviteCode extends InviteCodeView {
  codigo: string;
}

/** Previa: nenhum dado financeiro (mesma regra do convite por e-mail). */
export interface InviteCodePreview {
  familiaNome: string;
  convidadoPorNome: string;
  papelOferecido: PapelFamilia;
  expiraEm: Date;
}

type CodeRow = {
  uid: string;
  familiaUid: string;
  papelOferecido: PapelFamilia;
  situacao: SituacaoCodigoConvite;
  expiraEm: Date;
  familia: { nome: string; encerradaEm: Date | null };
  emissor: { nomeCompleto: string };
};

/**
 * Codigo de convite (D-FAM-009): entrada na familia sem e-mail de destino.
 * Uso unico, 24 h, papel nunca ADMINISTRADOR, so o HMAC e guardado. Todo
 * codigo invalido (malformado, inexistente, expirado, usado ou revogado) gera a
 * mesma resposta; tentativas erradas sao limitadas por usuario e auditadas
 * (sem o codigo digitado).
 */
@Injectable()
export class InviteCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly tokens: TokenService,
    private readonly limiter: RateLimiterService,
    config: AuthConfig,
  ) {
    this.cipher = new AesGcmCipher(config.inviteCodeEncryptionKey);
  }

  /** Chave propria (INVITE_CODE_ENCRYPTION_KEY), distinta das de e-mail, MFA e token. */
  private readonly cipher: AesGcmCipher;

  // ─── Administracao (ADMINISTRADOR) ─────────────────────────────────────────

  async issue(
    scope: FamilyScope,
    auth: AuthContext,
    dto: IssueInviteCodeDto,
    client: ClientInfo,
  ): Promise<IssuedInviteCode> {
    this.enforceIssueLimits(auth.usuario.uid, scope.familiaUid);
    // Um codigo ATIVO por familia: vencidos saem do caminho antes de checar.
    await this.expireOverdue(scope.familiaUid);
    if (await this.hasActive(scope.familiaUid))
      throw ApiErrors.inviteCodeActive();
    const papel = dto.papel ?? 'INTEGRANTE';
    const expiraEm = new Date(Date.now() + INVITE_CODE_TTL_MS);

    // Colisao de hash e praticamente impossivel (31^8); ainda assim tenta de novo.
    for (let attempt = 0; attempt < 3; attempt++) {
      const codigo = generateInviteCode();
      try {
        const row = await this.prisma.codigoConviteFamilia.create({
          data: {
            familiaUid: scope.familiaUid,
            emitidoPorUid: auth.usuario.uid,
            papelOferecido: papel,
            codigoHash: this.hashCode(normalizeInviteCode(codigo)),
            codigoCriptografado: this.cipher.encrypt(codigo),
            expiraEm,
          },
        });
        await this.audit.record({
          acao: 'codigo_convite.emitir',
          resultado: 'SUCESSO',
          client,
          usuarioUid: auth.usuario.uid,
          sessaoUid: auth.sessaoUid,
          familiaUid: scope.familiaUid,
          recurso: 'codigo_convite_familia',
          recursoUid: row.uid,
          metadados: { papelOferecido: papel },
        });
        return { ...this.toView(row), codigo };
      } catch (error) {
        if (!this.isUniqueViolation(error)) throw error;
        // Geracoes simultaneas: a segunda perde para o indice de "um ativo por familia".
        if (await this.hasActive(scope.familiaUid))
          throw ApiErrors.inviteCodeActive();
      }
    }
    throw new Error('Nao foi possivel gerar um codigo unico.');
  }

  async list(scope: FamilyScope): Promise<InviteCodeView[]> {
    await this.expireOverdue(scope.familiaUid);
    const rows = await this.prisma.codigoConviteFamilia.findMany({
      where: { familiaUid: scope.familiaUid },
      orderBy: [{ criadoEm: 'desc' }, { uid: 'asc' }],
      take: 50,
    });
    return rows.map((row) => this.toView(row));
  }

  /**
   * Revisualizacao do codigo ATIVO (somente administradores). A copia cifrada
   * so existe enquanto o codigo esta ativo; cada leitura e auditada.
   */
  async getActive(
    scope: FamilyScope,
    auth: AuthContext,
    client: ClientInfo,
  ): Promise<IssuedInviteCode> {
    await this.expireOverdue(scope.familiaUid);
    const row = await this.prisma.codigoConviteFamilia.findFirst({
      where: { familiaUid: scope.familiaUid, situacao: 'ATIVO' },
    });
    if (!row) throw ApiErrors.notFound();
    // Codigo gerado antes da copia cifrada existir: nao ha como mostra-lo de novo.
    if (!row.codigoCriptografado) throw ApiErrors.inviteCodeHidden();

    await this.audit.record({
      acao: 'codigo_convite.visualizar',
      resultado: 'SUCESSO',
      client,
      usuarioUid: auth.usuario.uid,
      sessaoUid: auth.sessaoUid,
      familiaUid: scope.familiaUid,
      recurso: 'codigo_convite_familia',
      recursoUid: row.uid,
    });
    return {
      ...this.toView(row),
      codigo: this.cipher.decrypt(row.codigoCriptografado),
    };
  }

  async revoke(
    scope: FamilyScope,
    auth: AuthContext,
    codigoUid: string,
    client: ClientInfo,
  ): Promise<void> {
    const result = await this.prisma.codigoConviteFamilia.updateMany({
      where: {
        uid: codigoUid,
        familiaUid: scope.familiaUid,
        situacao: 'ATIVO',
      },
      data: { situacao: 'REVOGADO', codigoCriptografado: null },
    });
    if (result.count === 0) {
      const exists = await this.prisma.codigoConviteFamilia.findFirst({
        where: { uid: codigoUid, familiaUid: scope.familiaUid },
        select: { uid: true },
      });
      if (!exists) throw ApiErrors.notFound();
      throw ApiErrors.inviteNotPending();
    }
    await this.audit.record({
      acao: 'codigo_convite.revogar',
      resultado: 'SUCESSO',
      client,
      usuarioUid: auth.usuario.uid,
      sessaoUid: auth.sessaoUid,
      familiaUid: scope.familiaUid,
      recurso: 'codigo_convite_familia',
      recursoUid: codigoUid,
    });
  }

  // ─── Quem digita o codigo (usuario autenticado) ────────────────────────────

  async preview(
    auth: AuthContext,
    input: string,
    client: ClientInfo,
  ): Promise<InviteCodePreview> {
    const row = await this.findUsable(auth, input, client);
    return {
      familiaNome: row.familia.nome,
      convidadoPorNome: row.emissor.nomeCompleto,
      papelOferecido: row.papelOferecido,
      expiraEm: row.expiraEm,
    };
  }

  /** Entra na familia e consome o codigo (uso unico) na mesma transacao. */
  async redeem(
    auth: AuthContext,
    input: string,
    client: ClientInfo,
  ): Promise<{ familiaUid: string }> {
    const found = await this.findUsable(auth, input, client);
    const usuarioUid = auth.usuario.uid;

    const outcome = await this.prisma.$transaction(async (tx) => {
      // Serializa usos concorrentes do mesmo codigo: so um consegue consumi-lo.
      const [locked] = await tx.$queryRaw<{ uid: string }[]>`
        SELECT uid FROM codigo_convite_familia WHERE uid = ${found.uid}::uuid FOR UPDATE`;
      if (!locked) return 'invalid' as const;
      const current = await tx.codigoConviteFamilia.findUniqueOrThrow({
        where: { uid: found.uid },
        include: { familia: { select: { encerradaEm: true } } },
      });
      if (
        current.situacao !== 'ATIVO' ||
        current.expiraEm.getTime() <= Date.now() ||
        current.familia.encerradaEm
      ) {
        return 'invalid' as const;
      }

      const existing = await tx.integranteFamilia.findFirst({
        where: {
          familiaUid: current.familiaUid,
          usuarioUid,
          situacao: 'ATIVO',
        },
        select: { uid: true },
      });
      // Quem ja e integrante nao consome o codigo.
      if (existing) return 'already' as const;

      await tx.integranteFamilia.create({
        data: {
          familiaUid: current.familiaUid,
          usuarioUid,
          papel: current.papelOferecido,
        },
      });
      await tx.codigoConviteFamilia.update({
        where: { uid: current.uid },
        data: {
          situacao: 'USADO',
          codigoCriptografado: null,
          usadoPorUid: usuarioUid,
          usadoEm: new Date(),
        },
      });
      return 'done' as const;
    });

    if (outcome === 'invalid') {
      await this.failAttempt(auth, client);
      throw ApiErrors.invalidInviteCode();
    }
    if (outcome === 'done') {
      await this.audit.record({
        acao: 'codigo_convite.usar',
        resultado: 'SUCESSO',
        client,
        usuarioUid,
        sessaoUid: auth.sessaoUid,
        familiaUid: found.familiaUid,
        recurso: 'codigo_convite_familia',
        recursoUid: found.uid,
        metadados: { papelOferecido: found.papelOferecido },
      });
    }
    return { familiaUid: found.familiaUid };
  }

  // ─── Internos ──────────────────────────────────────────────────────────────

  /** Valida o codigo digitado. Qualquer falha: mesma resposta, conta como tentativa errada. */
  private async findUsable(
    auth: AuthContext,
    input: string,
    client: ClientInfo,
  ): Promise<CodeRow> {
    this.assertNotBlocked(auth.usuario.uid);
    const normalized = normalizeInviteCode(input);
    const row = isWellFormedInviteCode(normalized)
      ? await this.prisma.codigoConviteFamilia.findUnique({
          where: { codigoHash: this.hashCode(normalized) },
          select: {
            uid: true,
            familiaUid: true,
            papelOferecido: true,
            situacao: true,
            expiraEm: true,
            familia: { select: { nome: true, encerradaEm: true } },
            emissor: { select: { nomeCompleto: true } },
          },
        })
      : null;

    if (
      !row ||
      row.situacao !== 'ATIVO' ||
      row.expiraEm.getTime() <= Date.now() ||
      row.familia.encerradaEm
    ) {
      await this.failAttempt(auth, client);
      throw ApiErrors.invalidInviteCode();
    }
    return row;
  }

  private hashCode(normalized: string): string {
    return this.tokens.hash(`family-invite-code:${normalized}`);
  }

  private assertNotBlocked(usuarioUid: string): void {
    const status = this.limiter.check(
      `invite-code:fail:${usuarioUid}`,
      FAMILY_LIMITS.inviteCodeFailuresPerUser,
    );
    if (status.blocked)
      throw ApiErrors.tooManyAttempts(status.retryAfterSeconds);
  }

  private async failAttempt(
    auth: AuthContext,
    client: ClientInfo,
  ): Promise<void> {
    this.limiter.record(
      `invite-code:fail:${auth.usuario.uid}`,
      FAMILY_LIMITS.inviteCodeFailuresPerUser.windowMs,
    );
    // Nunca grava o codigo digitado.
    await this.audit.record({
      acao: 'codigo_convite.tentativa',
      resultado: 'FALHA',
      client,
      usuarioUid: auth.usuario.uid,
      sessaoUid: auth.sessaoUid,
    });
  }

  private async hasActive(familiaUid: string): Promise<boolean> {
    const found = await this.prisma.codigoConviteFamilia.findFirst({
      where: { familiaUid, situacao: 'ATIVO' },
      select: { uid: true },
    });
    return found !== null;
  }

  private async expireOverdue(familiaUid: string): Promise<void> {
    await this.prisma.codigoConviteFamilia.updateMany({
      where: { familiaUid, situacao: 'ATIVO', expiraEm: { lte: new Date() } },
      data: { situacao: 'EXPIRADO', codigoCriptografado: null },
    });
  }

  private enforceIssueLimits(usuarioUid: string, familiaUid: string): void {
    const rules = [
      [`invite:admin:${usuarioUid}`, FAMILY_LIMITS.invitePerAdmin],
      [`invite:family:${familiaUid}`, FAMILY_LIMITS.invitePerFamily],
    ] as const;
    for (const [key, rule] of rules) {
      const status = this.limiter.check(key, rule);
      if (status.blocked)
        throw ApiErrors.tooManyAttempts(status.retryAfterSeconds);
    }
    for (const [key, rule] of rules) this.limiter.record(key, rule.windowMs);
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      (error as Prisma.PrismaClientKnownRequestError | undefined)?.code ===
      'P2002'
    );
  }

  private toView(row: {
    uid: string;
    papelOferecido: PapelFamilia;
    situacao: SituacaoCodigoConvite;
    expiraEm: Date;
    criadoEm: Date;
    usadoEm: Date | null;
  }): InviteCodeView {
    return {
      uid: row.uid,
      papel: row.papelOferecido,
      situacao: row.situacao,
      expiraEm: row.expiraEm,
      criadoEm: row.criadoEm,
      usadoEm: row.usadoEm,
    };
  }
}
