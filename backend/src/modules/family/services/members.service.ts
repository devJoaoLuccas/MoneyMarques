import { Injectable } from '@nestjs/common';
import { ApiErrors } from '../../../common/errors/api-exception';
import { ClientInfo } from '../../../common/http/client-info.decorator';
import { Prisma } from '../../../generated/prisma/client';
import {
  PapelFamilia,
  SituacaoIntegrante,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthContext } from '../../auth/auth.types';
import { EmailVaultService } from '../../auth/services/email-vault.service';
import { maskEmail } from '../domain/mask-email';
import { ListMembersQueryDto, UpdateMemberDto } from '../dto/family.dto';
import { PAGE_SIZE_DEFAULT } from '../family.constants';
import { FamilyScope } from '../guards/family-context.guard';

export interface MemberView {
  uid: string;
  nome: string;
  /** Completo para administradores; mascarado para os demais (D-FAM-007). */
  email: string;
  papel: PapelFamilia;
  situacao: SituacaoIntegrante;
  ingressouEm: Date;
  removidoEm: Date | null;
  voce: boolean;
}

export interface Page<T> {
  itens: T[];
  pagina: number;
  tamanho: number;
  total: number;
}

/**
 * FAM-003: integrantes. Regra central (RN-FAM-005/016): a familia sempre tem
 * ao menos um administrador ativo. Como nao e expressavel por constraint,
 * a checagem acontece em transacao com `SELECT ... FOR UPDATE` sobre os
 * vinculos administradores, serializando operacoes concorrentes.
 *
 * Lacuna D-FAM-006 (titularidade de recursos ao remover/sair): ainda nao ha
 * recursos financeiros (Modulo 04). A remocao apenas encerra o vinculo
 * (soft delete); a politica de titularidade deve ser definida antes de
 * liberar a remocao em producao.
 */
@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly vault: EmailVaultService,
  ) {}

  async list(
    scope: FamilyScope,
    auth: AuthContext,
    query: ListMembersQueryDto,
  ): Promise<Page<MemberView>> {
    const isAdmin = scope.papel === 'ADMINISTRADOR';
    const pagina = query.pagina ?? 1;
    const tamanho = query.tamanho ?? PAGE_SIZE_DEFAULT;

    const where: Prisma.IntegranteFamiliaWhereInput = {
      familiaUid: scope.familiaUid,
      // Historico de removidos so para administradores.
      situacao: isAdmin ? (query.situacao ?? 'ATIVO') : 'ATIVO',
      ...(query.papel ? { papel: query.papel } : {}),
      ...(query.nome
        ? {
            usuario: {
              nomeCompleto: { contains: query.nome, mode: 'insensitive' },
            },
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.integranteFamilia.count({ where }),
      this.prisma.integranteFamilia.findMany({
        where,
        orderBy: [{ ingressouEm: 'asc' }, { uid: 'asc' }],
        skip: (pagina - 1) * tamanho,
        take: tamanho,
        select: {
          uid: true,
          papel: true,
          situacao: true,
          ingressouEm: true,
          removidoEm: true,
          usuario: {
            select: { uid: true, nomeCompleto: true, emailCriptografado: true },
          },
        },
      }),
    ]);

    return {
      itens: rows.map((row) => {
        const email = this.vault.open(row.usuario.emailCriptografado);
        return {
          uid: row.uid,
          nome: row.usuario.nomeCompleto,
          email: isAdmin ? email : maskEmail(email),
          papel: row.papel,
          situacao: row.situacao,
          ingressouEm: row.ingressouEm,
          removidoEm: row.removidoEm,
          voce: row.usuario.uid === auth.usuario.uid,
        };
      }),
      pagina,
      tamanho,
      total,
    };
  }

  /** CA-FAM-010: altera papel; nunca rebaixa o ultimo administrador. */
  async changeRole(
    scope: FamilyScope,
    auth: AuthContext,
    integranteUid: string,
    dto: UpdateMemberDto,
    client: ClientInfo,
  ): Promise<void> {
    if (dto.papel === 'ADMINISTRADOR' && dto.confirmarPromocao !== true) {
      throw ApiErrors.validation({
        confirmarPromocao: [
          'Confirme a promoção para administrador para continuar.',
        ],
      });
    }

    const change = await this.prisma.$transaction(async (tx) => {
      const admins = await this.lockAdmins(tx, scope.familiaUid);
      const target = await this.findActive(tx, scope.familiaUid, integranteUid);

      if (target.papel === dto.papel) return null; // idempotente
      if (
        target.papel === 'ADMINISTRADOR' &&
        dto.papel !== 'ADMINISTRADOR' &&
        admins.length <= 1
      ) {
        throw ApiErrors.lastAdminRequired();
      }

      await tx.integranteFamilia.update({
        where: { uid: target.uid },
        data: { papel: dto.papel },
      });
      return { de: target.papel, para: dto.papel };
    });

    if (change) {
      await this.audit.record({
        acao: 'integrante.alterar_papel',
        resultado: 'SUCESSO',
        client,
        usuarioUid: auth.usuario.uid,
        sessaoUid: auth.sessaoUid,
        familiaUid: scope.familiaUid,
        recurso: 'integrante_familia',
        recursoUid: integranteUid,
        alteracoes: { papelAnterior: change.de, papelNovo: change.para },
      });
    }
  }

  /**
   * CA-FAM-010/011/012: remocao logica (preserva historico); revoga o acesso
   * de imediato (o vinculo e validado a cada requisicao). Nunca remove o
   * ultimo administrador.
   */
  async remove(
    scope: FamilyScope,
    auth: AuthContext,
    integranteUid: string,
    client: ClientInfo,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const admins = await this.lockAdmins(tx, scope.familiaUid);
      const target = await this.findActive(tx, scope.familiaUid, integranteUid);

      if (target.papel === 'ADMINISTRADOR' && admins.length <= 1) {
        throw ApiErrors.lastAdminRequired();
      }

      await tx.integranteFamilia.update({
        where: { uid: target.uid },
        data: { situacao: 'REMOVIDO', removidoEm: new Date() },
      });
    });

    await this.audit.record({
      acao: 'integrante.remover',
      resultado: 'SUCESSO',
      client,
      usuarioUid: auth.usuario.uid,
      sessaoUid: auth.sessaoUid,
      familiaUid: scope.familiaUid,
      recurso: 'integrante_familia',
      recursoUid: integranteUid,
    });
  }

  /** Trava os vinculos administradores ativos (ordem fixa evita deadlock). */
  private async lockAdmins(
    tx: Prisma.TransactionClient,
    familiaUid: string,
  ): Promise<{ uid: string }[]> {
    return tx.$queryRaw<{ uid: string }[]>`
      SELECT uid FROM integrante_familia
      WHERE familia_uid = ${familiaUid}::uuid
        AND papel = 'ADMINISTRADOR'
        AND situacao = 'ATIVO'
      ORDER BY uid
      FOR UPDATE`;
  }

  /** Integrante ATIVO da propria familia; qualquer outro caso e 404 (anti-IDOR). */
  private async findActive(
    tx: Prisma.TransactionClient,
    familiaUid: string,
    integranteUid: string,
  ) {
    const target = await tx.integranteFamilia.findFirst({
      where: { uid: integranteUid, familiaUid, situacao: 'ATIVO' },
      select: { uid: true, papel: true },
    });
    if (!target) throw ApiErrors.notFound();
    return target;
  }
}
