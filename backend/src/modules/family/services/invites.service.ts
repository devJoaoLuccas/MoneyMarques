import { Injectable, Logger } from '@nestjs/common';
import { ApiErrors } from '../../../common/errors/api-exception';
import { ClientInfo } from '../../../common/http/client-info.decorator';
import { Prisma } from '../../../generated/prisma/client';
import type { ConviteFamilia } from '../../../generated/prisma/client';
import { PapelFamilia, SituacaoConvite } from '../../../generated/prisma/enums';
import { RateLimiterService } from '../../../common/security/rate-limiter.service';
import { AuthConfig } from '../../../config/auth.config';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthContext } from '../../auth/auth.types';
import { EmailVaultService } from '../../auth/services/email-vault.service';
import { TokenService } from '../../auth/services/token.service';
import { canTransitionInvite } from '../domain/invite-state';
import { IssueInviteDto, ListInvitesQueryDto } from '../dto/family.dto';
import { FAMILY_LIMITS, PAGE_SIZE_DEFAULT } from '../family.constants';
import { FamilyScope } from '../guards/family-context.guard';
import { FamilyMailer } from './family-mailer.service';
import { Page } from './members.service';

export interface InviteView {
  uid: string;
  /** `email`: convite enviado por e-mail. `codigo`: entrada por codigo de convite ja usado. */
  origem: 'email' | 'codigo';
  /** Nome de quem entrou (so em `origem: 'codigo'`; o convite por e-mail ainda nao tem conta associada). */
  nome: string | null;
  /** Destinatario do convite; em `origem: 'codigo'`, o e-mail de quem entrou. */
  email: string;
  papel: PapelFamilia;
  situacao: SituacaoConvite;
  expiraEm: Date;
  criadoEm: Date;
  respondidoEm: Date | null;
}

/** Previa do convite: nenhum dado financeiro (CA-FAM-022). */
export interface InvitePreview {
  familiaNome: string;
  convidadoPorNome: string;
  papelOferecido: PapelFamilia;
  expiraEm: Date;
}

type Response = 'ACEITO' | 'RECUSADO';

type InviteRow = {
  uid: string;
  familiaUid: string;
  emailDestinoHmac: string;
  papelOferecido: PapelFamilia;
  situacao: SituacaoConvite;
  aceitoPorUid: string | null;
  expiraEm: Date;
};

/**
 * FAM-005: convites. O token (32 bytes aleatorios) so existe em claro no link
 * do e-mail; persiste-se apenas o HMAC. Todas as respostas de erro de token
 * sao neutras (invalido, expirado, outro e-mail e inexistente parecem iguais).
 */
@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly vault: EmailVaultService,
    private readonly tokens: TokenService,
    private readonly limiter: RateLimiterService,
    private readonly config: AuthConfig,
    private readonly mailer: FamilyMailer,
  ) {}

  // ─── Administracao (ADMINISTRADOR) ─────────────────────────────────────────

  async issue(
    scope: FamilyScope,
    auth: AuthContext,
    dto: IssueInviteDto,
    client: ClientInfo,
  ): Promise<InviteView> {
    this.enforceIssueLimits(auth.usuario.uid, scope.familiaUid);

    const sealed = this.vault.seal(dto.email);
    await this.expireOverdue(scope.familiaUid);

    // O administrador ja enxerga os integrantes: avisar "ja e membro" nao
    // expoe nada alem disso. Para quem nao e membro a resposta e identica
    // exista conta ou nao (sem enumeracao de contas).
    const alreadyMember = await this.prisma.integranteFamilia.findFirst({
      where: {
        familiaUid: scope.familiaUid,
        situacao: 'ATIVO',
        usuario: { emailHmac: sealed.emailHmac },
      },
      select: { uid: true },
    });
    if (alreadyMember) throw ApiErrors.alreadyMember();

    const token = this.tokens.generateToken(32);
    const papel = dto.papel ?? 'INTEGRANTE';
    const expiraEm = new Date(Date.now() + this.config.familyInviteTtlMs);

    let convite: ConviteFamilia;
    try {
      convite = await this.prisma.conviteFamilia.create({
        data: {
          familiaUid: scope.familiaUid,
          emitidoPorUid: auth.usuario.uid,
          emailDestinoHmac: sealed.emailHmac,
          emailDestinoCriptografado: sealed.emailCriptografado,
          papelOferecido: papel,
          tokenHash: this.tokens.hash(token),
          expiraEm,
        },
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) throw ApiErrors.invitePending();
      throw error;
    }

    await this.deliver(convite.uid, dto.email, token, scope, auth, {
      papel,
      expiraEm,
    });
    await this.audit.record({
      acao: 'convite.emitir',
      resultado: 'SUCESSO',
      client,
      usuarioUid: auth.usuario.uid,
      sessaoUid: auth.sessaoUid,
      familiaUid: scope.familiaUid,
      recurso: 'convite_familia',
      recursoUid: convite.uid,
      metadados: { papelOferecido: papel },
    });

    return this.toView(convite, dto.email);
  }

  async list(
    scope: FamilyScope,
    query: ListInvitesQueryDto,
  ): Promise<Page<InviteView>> {
    const pagina = query.pagina ?? 1;
    const tamanho = query.tamanho ?? PAGE_SIZE_DEFAULT;
    await this.expireOverdue(scope.familiaUid);

    const where: Prisma.ConviteFamiliaWhereInput = {
      familiaUid: scope.familiaUid,
      ...(query.situacao ? { situacao: query.situacao } : {}),
    };
    // Codigos de convite USADOS entram na lista como convites aceitos (D-FAM-009).
    const includeCodes = !query.situacao || query.situacao === 'ACEITO';
    const codeWhere: Prisma.CodigoConviteFamiliaWhereInput = {
      familiaUid: scope.familiaUid,
      situacao: 'USADO',
    };
    // Paginacao de uniao: busca ate `pagina * tamanho` de cada origem, ordena junto e fatia.
    const take = pagina * tamanho;
    const [emailTotal, emailRows, codeTotal, codeRows] =
      await this.prisma.$transaction([
        this.prisma.conviteFamilia.count({ where }),
        this.prisma.conviteFamilia.findMany({
          where,
          orderBy: [{ criadoEm: 'desc' }, { uid: 'asc' }],
          take,
        }),
        this.prisma.codigoConviteFamilia.count({
          where: includeCodes ? codeWhere : { uid: { in: [] } },
        }),
        this.prisma.codigoConviteFamilia.findMany({
          where: includeCodes ? codeWhere : { uid: { in: [] } },
          orderBy: [{ criadoEm: 'desc' }, { uid: 'asc' }],
          take,
          include: {
            usuario: {
              select: { nomeCompleto: true, emailCriptografado: true },
            },
          },
        }),
      ]);

    const itens: InviteView[] = [
      ...emailRows.map((row) =>
        this.toView(row, this.vault.open(row.emailDestinoCriptografado)),
      ),
      ...codeRows.map((row): InviteView => ({
        uid: row.uid,
        origem: 'codigo',
        nome: row.usuario?.nomeCompleto ?? null,
        // Administradores ja veem o e-mail completo na lista de integrantes (D-FAM-007).
        email: row.usuario
          ? this.vault.open(row.usuario.emailCriptografado)
          : '',
        papel: row.papelOferecido,
        situacao: 'ACEITO',
        expiraEm: row.expiraEm,
        criadoEm: row.criadoEm,
        respondidoEm: row.usadoEm,
      })),
    ]
      .sort(
        (a, b) =>
          b.criadoEm.getTime() - a.criadoEm.getTime() ||
          a.uid.localeCompare(b.uid),
      )
      .slice((pagina - 1) * tamanho, pagina * tamanho);

    return { itens, pagina, tamanho, total: emailTotal + codeTotal };
  }

  async revoke(
    scope: FamilyScope,
    auth: AuthContext,
    conviteUid: string,
    client: ClientInfo,
  ): Promise<void> {
    await this.expireOverdue(scope.familiaUid);
    await this.prisma.$transaction(async (tx) => {
      const invite = await this.lockInvite(tx, conviteUid, scope.familiaUid);
      if (!canTransitionInvite(invite.situacao, 'REVOGADO')) {
        throw ApiErrors.inviteNotPending();
      }
      await tx.conviteFamilia.update({
        where: { uid: invite.uid },
        data: { situacao: 'REVOGADO', respondidoEm: new Date() },
      });
    });

    await this.audit.record({
      acao: 'convite.revogar',
      resultado: 'SUCESSO',
      client,
      usuarioUid: auth.usuario.uid,
      sessaoUid: auth.sessaoUid,
      familiaUid: scope.familiaUid,
      recurso: 'convite_familia',
      recursoUid: conviteUid,
    });
  }

  /** Reenvio: gera novo token e invalida o anterior (D-FAM-002). So para convites pendentes. */
  async resend(
    scope: FamilyScope,
    auth: AuthContext,
    conviteUid: string,
    client: ClientInfo,
  ): Promise<void> {
    this.enforceIssueLimits(auth.usuario.uid, scope.familiaUid);
    await this.expireOverdue(scope.familiaUid);

    const token = this.tokens.generateToken(32);
    const expiraEm = new Date(Date.now() + this.config.familyInviteTtlMs);

    const invite = await this.prisma.$transaction(async (tx) => {
      const current = await this.lockInvite(tx, conviteUid, scope.familiaUid);
      if (current.situacao !== 'PENDENTE') throw ApiErrors.inviteNotPending();
      return tx.conviteFamilia.update({
        where: { uid: current.uid },
        data: { tokenHash: this.tokens.hash(token), expiraEm },
      });
    });

    await this.deliver(
      invite.uid,
      this.vault.open(invite.emailDestinoCriptografado),
      token,
      scope,
      auth,
      { papel: invite.papelOferecido, expiraEm },
    );
    await this.audit.record({
      acao: 'convite.reenviar',
      resultado: 'SUCESSO',
      client,
      usuarioUid: auth.usuario.uid,
      sessaoUid: auth.sessaoUid,
      familiaUid: scope.familiaUid,
      recurso: 'convite_familia',
      recursoUid: conviteUid,
    });
  }

  // ─── Destinatario (usuario autenticado) ────────────────────────────────────

  async preview(auth: AuthContext, token: string): Promise<InvitePreview> {
    this.enforceResponseLimit(auth.usuario.uid);
    const invite = await this.findByToken(token);
    return this.previewOf(auth, invite);
  }

  /** Aceite pelo link do e-mail. Idempotente para o mesmo usuario. */
  async acceptByToken(
    auth: AuthContext,
    token: string,
    client: ClientInfo,
  ): Promise<{ familiaUid: string }> {
    this.enforceResponseLimit(auth.usuario.uid);
    const invite = await this.findByToken(token);
    return this.respond(auth, invite, 'ACEITO', client);
  }

  async declineByToken(
    auth: AuthContext,
    token: string,
    client: ClientInfo,
  ): Promise<void> {
    this.enforceResponseLimit(auth.usuario.uid);
    const invite = await this.findByToken(token);
    await this.respond(auth, invite, 'RECUSADO', client);
  }

  /**
   * Aceite/recusa a partir da lista de convites pendentes da sessao (que
   * conhece apenas o uid, nunca o token). Exige o mesmo e-mail do convite.
   */
  async acceptPending(
    auth: AuthContext,
    conviteUid: string,
    client: ClientInfo,
  ): Promise<{ familiaUid: string }> {
    this.enforceResponseLimit(auth.usuario.uid);
    const invite = await this.findOwnPending(auth, conviteUid);
    return this.respond(auth, invite, 'ACEITO', client);
  }

  async declinePending(
    auth: AuthContext,
    conviteUid: string,
    client: ClientInfo,
  ): Promise<void> {
    this.enforceResponseLimit(auth.usuario.uid);
    const invite = await this.findOwnPending(auth, conviteUid);
    await this.respond(auth, invite, 'RECUSADO', client);
  }

  // ─── Internos ──────────────────────────────────────────────────────────────

  /**
   * Aceite/recusa. Serializa por `FOR UPDATE` no convite: aceites concorrentes
   * geram um unico vinculo (CA-FAM-020). Erros de token sao sempre neutros.
   */
  private async respond(
    auth: AuthContext,
    invite: InviteRow,
    response: Response,
    client: ClientInfo,
  ): Promise<{ familiaUid: string }> {
    const usuarioUid = auth.usuario.uid;
    this.assertRecipient(auth, invite);

    const outcome = await this.prisma.$transaction(async (tx) => {
      const [locked] = await tx.$queryRaw<{ uid: string }[]>`
        SELECT uid FROM convite_familia WHERE uid = ${invite.uid}::uuid FOR UPDATE`;
      if (!locked) return 'invalid' as const;

      const current = await tx.conviteFamilia.findUniqueOrThrow({
        where: { uid: invite.uid },
        include: { familia: { select: { encerradaEm: true } } },
      });

      // Idempotencia: o mesmo usuario repetindo o aceite recebe sucesso.
      if (
        response === 'ACEITO' &&
        current.situacao === 'ACEITO' &&
        current.aceitoPorUid === usuarioUid
      ) {
        return 'already' as const;
      }
      if (current.situacao !== 'PENDENTE' || current.familia.encerradaEm) {
        return 'invalid' as const;
      }
      if (current.expiraEm.getTime() <= Date.now()) {
        await tx.conviteFamilia.update({
          where: { uid: current.uid },
          data: { situacao: 'EXPIRADO', respondidoEm: new Date() },
        });
        return 'invalid' as const;
      }

      if (response === 'ACEITO') {
        const existing = await tx.integranteFamilia.findFirst({
          where: {
            familiaUid: current.familiaUid,
            usuarioUid,
            situacao: 'ATIVO',
          },
          select: { uid: true },
        });
        if (!existing) {
          await tx.integranteFamilia.create({
            data: {
              familiaUid: current.familiaUid,
              usuarioUid,
              papel: current.papelOferecido,
            },
          });
        }
      }
      await tx.conviteFamilia.update({
        where: { uid: current.uid },
        data: {
          situacao: response,
          respondidoEm: new Date(),
          aceitoPorUid: response === 'ACEITO' ? usuarioUid : null,
        },
      });
      return 'done' as const;
    });

    if (outcome === 'invalid') throw ApiErrors.invalidToken();

    if (outcome === 'done') {
      await this.audit.record({
        acao: response === 'ACEITO' ? 'convite.aceitar' : 'convite.recusar',
        resultado: 'SUCESSO',
        client,
        usuarioUid,
        sessaoUid: auth.sessaoUid,
        familiaUid: invite.familiaUid,
        recurso: 'convite_familia',
        recursoUid: invite.uid,
      });
    }
    return { familiaUid: invite.familiaUid };
  }

  private async findByToken(token: string): Promise<InviteRow> {
    const invite = await this.prisma.conviteFamilia.findUnique({
      where: { tokenHash: this.tokens.hash(token) },
      select: this.inviteSelect,
    });
    if (!invite) throw ApiErrors.invalidToken();
    return invite;
  }

  private async findOwnPending(
    auth: AuthContext,
    conviteUid: string,
  ): Promise<InviteRow> {
    const invite = await this.prisma.conviteFamilia.findFirst({
      where: {
        uid: conviteUid,
        emailDestinoHmac: this.vault.hmac(auth.usuario.email),
      },
      select: this.inviteSelect,
    });
    if (!invite) throw ApiErrors.notFound();
    return invite;
  }

  private readonly inviteSelect = {
    uid: true,
    familiaUid: true,
    emailDestinoHmac: true,
    papelOferecido: true,
    situacao: true,
    aceitoPorUid: true,
    expiraEm: true,
  } satisfies Prisma.ConviteFamiliaSelect;

  /** CA-FAM-018: o e-mail do usuario autenticado deve ser o do convite (resposta neutra). */
  private assertRecipient(auth: AuthContext, invite: InviteRow): void {
    const expected = this.vault.hmac(auth.usuario.email);
    if (!this.tokens.safeEquals(expected, invite.emailDestinoHmac)) {
      throw ApiErrors.invalidToken();
    }
  }

  private async previewOf(
    auth: AuthContext,
    invite: InviteRow,
  ): Promise<InvitePreview> {
    this.assertRecipient(auth, invite);
    await this.expireOverdue(invite.familiaUid);

    const current = await this.prisma.conviteFamilia.findUniqueOrThrow({
      where: { uid: invite.uid },
      select: {
        situacao: true,
        expiraEm: true,
        papelOferecido: true,
        familia: { select: { nome: true, encerradaEm: true } },
        emissor: { select: { nomeCompleto: true } },
      },
    });
    if (current.situacao !== 'PENDENTE' || current.familia.encerradaEm) {
      throw ApiErrors.invalidToken();
    }
    return {
      familiaNome: current.familia.nome,
      convidadoPorNome: current.emissor.nomeCompleto,
      papelOferecido: current.papelOferecido,
      expiraEm: current.expiraEm,
    };
  }

  /** Marca como EXPIRADO os convites pendentes vencidos da familia (estado consistente). */
  private async expireOverdue(familiaUid: string): Promise<void> {
    await this.prisma.conviteFamilia.updateMany({
      where: {
        familiaUid,
        situacao: 'PENDENTE',
        expiraEm: { lte: new Date() },
      },
      data: { situacao: 'EXPIRADO', respondidoEm: new Date() },
    });
  }

  private async lockInvite(
    tx: Prisma.TransactionClient,
    conviteUid: string,
    familiaUid: string,
  ) {
    const [locked] = await tx.$queryRaw<{ uid: string }[]>`
      SELECT uid FROM convite_familia
      WHERE uid = ${conviteUid}::uuid AND familia_uid = ${familiaUid}::uuid
      FOR UPDATE`;
    if (!locked) throw ApiErrors.notFound();
    return tx.conviteFamilia.findUniqueOrThrow({ where: { uid: locked.uid } });
  }

  /**
   * Envio direto pelo MailPort, sem fila: a criacao do convite nao depende da
   * entrega (falha so e registrada, sem o token nem o endereco).
   */
  private async deliver(
    conviteUid: string,
    to: string,
    token: string,
    scope: FamilyScope,
    auth: AuthContext,
    details: { papel: PapelFamilia; expiraEm: Date },
  ): Promise<void> {
    try {
      const familia = await this.prisma.familia.findUniqueOrThrow({
        where: { uid: scope.familiaUid },
        select: { nome: true },
      });
      await this.mailer.sendInvite({
        to,
        familiaNome: familia.nome,
        convidadoPorNome: auth.usuario.nomeCompleto,
        papel: details.papel,
        token,
        expiraEm: details.expiraEm,
      });
    } catch {
      this.logger.error(`Falha ao enviar o e-mail do convite ${conviteUid}.`);
    }
  }

  private enforceIssueLimits(usuarioUid: string, familiaUid: string): void {
    const rules = [
      [`invite:admin:${usuarioUid}`, FAMILY_LIMITS.invitePerAdmin],
      [`invite:family:${familiaUid}`, FAMILY_LIMITS.invitePerFamily],
    ] as const;
    for (const [key, rule] of rules) {
      const status = this.limiter.check(key, rule);
      if (status.blocked) {
        throw ApiErrors.tooManyAttempts(status.retryAfterSeconds);
      }
    }
    for (const [key, rule] of rules) this.limiter.record(key, rule.windowMs);
  }

  private enforceResponseLimit(usuarioUid: string): void {
    const key = `invite:response:${usuarioUid}`;
    const rule = FAMILY_LIMITS.inviteResponsePerUser;
    const status = this.limiter.check(key, rule);
    if (status.blocked) {
      throw ApiErrors.tooManyAttempts(status.retryAfterSeconds);
    }
    this.limiter.record(key, rule.windowMs);
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private toView(
    row: {
      uid: string;
      papelOferecido: PapelFamilia;
      situacao: SituacaoConvite;
      expiraEm: Date;
      criadoEm: Date;
      respondidoEm: Date | null;
    },
    email: string,
  ): InviteView {
    return {
      uid: row.uid,
      origem: 'email',
      nome: null,
      email,
      papel: row.papelOferecido,
      situacao: row.situacao,
      expiraEm: row.expiraEm,
      criadoEm: row.criadoEm,
      respondidoEm: row.respondidoEm,
    };
  }
}
