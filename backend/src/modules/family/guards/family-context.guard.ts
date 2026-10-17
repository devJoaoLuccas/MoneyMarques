import {
  applyDecorators,
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isUUID } from 'class-validator';
import type { Request } from 'express';
import { ApiErrors } from '../../../common/errors/api-exception';
import { PapelFamilia } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { Auth } from '../../auth/guards/auth.guard';
import type { AuthenticatedRequest } from '../../auth/guards/auth.guard';
import { canPerformFamilyAction, FamilyAction } from '../domain/access-policy';

/** Contexto familiar resolvido pelo servidor a cada requisicao (RN-FAM-010). */
export interface FamilyScope {
  familiaUid: string;
  integranteUid: string;
  papel: PapelFamilia;
}

export type FamilyRequest = AuthenticatedRequest & { family: FamilyScope };

const FAMILY_ACTION_KEY = 'family:action';

/**
 * Resolve a familia da rota (`:familiaUid`) e valida o vinculo ATIVO do usuario
 * da sessao a cada requisicao: o ID vindo do cliente nunca e prova de
 * autorizacao. Sem vinculo, responde 404 (nao revela a existencia da familia);
 * com vinculo mas sem permissao para a acao, 403. Nao ha cache de decisao
 * (revogacao imediata, RN-FAM-009).
 */
@Injectable()
export class FamilyContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FamilyRequest>();
    const action =
      this.reflector.getAllAndOverride<FamilyAction>(FAMILY_ACTION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'VER_FAMILIA';

    const familiaUid = (request.params as Record<string, string>).familiaUid;
    if (!isUUID(familiaUid)) throw ApiErrors.notFound();

    const usuarioUid = request.auth.usuario.uid;
    const membership = await this.prisma.integranteFamilia.findFirst({
      where: {
        familiaUid,
        usuarioUid,
        situacao: 'ATIVO',
        familia: { encerradaEm: null },
      },
      select: { uid: true, papel: true },
    });

    if (!membership) {
      await this.deny(request, action, familiaUid, null);
      throw ApiErrors.notFound();
    }

    if (!canPerformFamilyAction(membership.papel, action)) {
      await this.deny(request, action, familiaUid, familiaUid);
      throw ApiErrors.forbidden();
    }

    request.family = {
      familiaUid,
      integranteUid: membership.uid,
      papel: membership.papel,
    };
    return true;
  }

  /** `familiaFk` so e informado quando a familia existe para o usuario (FK da auditoria). */
  private deny(
    request: Request & { auth: AuthenticatedRequest['auth'] },
    action: FamilyAction,
    recursoUid: string,
    familiaFk: string | null,
  ): Promise<void> {
    return this.audit.record({
      acao: 'familia.acesso_negado',
      resultado: 'NEGADO',
      usuarioUid: request.auth.usuario.uid,
      sessaoUid: request.auth.sessaoUid,
      familiaUid: familiaFk,
      recurso: 'familia',
      recursoUid,
      metadados: { acaoSolicitada: action },
    });
  }
}

/**
 * Exige sessao completa + vinculo ativo + permissao para a acao na familia da
 * rota. Sem argumento exige apenas ser membro ativo (`VER_FAMILIA`).
 */
export const FamilyAccess = (action: FamilyAction = 'VER_FAMILIA') =>
  applyDecorators(
    Auth('full'),
    SetMetadata(FAMILY_ACTION_KEY, action),
    UseGuards(FamilyContextGuard),
  );

/** Contexto familiar validado da requisicao (disponivel em rotas com @FamilyAccess()). */
export const CurrentFamily = createParamDecorator(
  (_data: unknown, context: ExecutionContext): FamilyScope =>
    context.switchToHttp().getRequest<FamilyRequest>().family,
);
