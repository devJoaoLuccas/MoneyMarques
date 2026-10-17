import { Injectable } from '@nestjs/common';
import { ClientInfo } from '../../../common/http/client-info.decorator';
import { PapelFamilia } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthContext } from '../../auth/auth.types';
import { CreateFamilyDto } from '../dto/family.dto';
import { FamilyScope } from '../guards/family-context.guard';

export interface FamilySummary {
  uid: string;
  nome: string;
  descricao: string | null;
  avatar: string | null;
  papel: PapelFamilia;
}

/** FAM-001 e FAM-002: criacao atomica, listagem das familias do usuario e leitura. */
@Injectable()
export class FamilyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * RN-FAM-001/002: familia + vinculo ADMINISTRADOR do criador na mesma
   * transacao; qualquer falha reverte tudo (CA-FAM-003). Nenhum recurso
   * financeiro e compartilhado automaticamente (CA-FAM-005).
   */
  async create(
    auth: AuthContext,
    dto: CreateFamilyDto,
    client: ClientInfo,
  ): Promise<FamilySummary> {
    const usuarioUid = auth.usuario.uid;
    const familia = await this.prisma.$transaction(async (tx) => {
      const created = await tx.familia.create({
        data: {
          criadorUid: usuarioUid,
          nome: dto.nome,
          descricao: dto.descricao ?? null,
          avatarUrl: dto.avatar ?? null,
        },
      });
      await tx.integranteFamilia.create({
        data: {
          familiaUid: created.uid,
          usuarioUid,
          papel: 'ADMINISTRADOR',
        },
      });
      return created;
    });

    await this.audit.record({
      acao: 'familia.criar',
      resultado: 'SUCESSO',
      client,
      usuarioUid,
      sessaoUid: auth.sessaoUid,
      familiaUid: familia.uid,
      recurso: 'familia',
      recursoUid: familia.uid,
    });

    return this.toSummary(familia, 'ADMINISTRADOR');
  }

  /** Somente as familias em que o usuario tem vinculo ativo (nada de outras). */
  async listMine(auth: AuthContext): Promise<{ itens: FamilySummary[] }> {
    const memberships = await this.prisma.integranteFamilia.findMany({
      where: {
        usuarioUid: auth.usuario.uid,
        situacao: 'ATIVO',
        familia: { encerradaEm: null },
      },
      select: { papel: true, familia: true },
      orderBy: [{ ingressouEm: 'asc' }, { uid: 'asc' }],
    });
    return {
      itens: memberships.map((m) => this.toSummary(m.familia, m.papel)),
    };
  }

  async get(scope: FamilyScope): Promise<FamilySummary> {
    const familia = await this.prisma.familia.findUniqueOrThrow({
      where: { uid: scope.familiaUid },
    });
    return this.toSummary(familia, scope.papel);
  }

  private toSummary(
    familia: {
      uid: string;
      nome: string;
      descricao: string | null;
      avatarUrl: string | null;
    },
    papel: PapelFamilia,
  ): FamilySummary {
    return {
      uid: familia.uid,
      nome: familia.nome,
      descricao: familia.descricao,
      avatar: familia.avatarUrl,
      papel,
    };
  }
}
