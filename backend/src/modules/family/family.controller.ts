import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Client } from '../../common/http/client-info.decorator';
import type { ClientInfo } from '../../common/http/client-info.decorator';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator';
import { Auth } from '../auth/guards/auth.guard';
import type { AuthContext } from '../auth/auth.types';
import { parseUid } from './decorators/parse-uid.pipe';
import {
  CreateFamilyDto,
  IssueInviteCodeDto,
  IssueInviteDto,
  ListInvitesQueryDto,
  ListMembersQueryDto,
  UpdateMemberDto,
} from './dto/family.dto';
import { CurrentFamily, FamilyAccess } from './guards/family-context.guard';
import type { FamilyScope } from './guards/family-context.guard';
import { FamilyService } from './services/family.service';
import { InviteCodesService } from './services/invite-codes.service';
import { InvitesService } from './services/invites.service';
import { MembersService } from './services/members.service';

/**
 * Controller fino: so HTTP. A autorizacao e feita pelo FamilyContextGuard
 * (vinculo + papel validados no servidor a cada requisicao); a regra de
 * negocio fica nos servicos.
 */
@Controller('familias')
export class FamilyController {
  constructor(
    private readonly families: FamilyService,
    private readonly members: MembersService,
    private readonly invites: InvitesService,
    private readonly inviteCodes: InviteCodesService,
  ) {}

  @Auth()
  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreateFamilyDto,
    @Client() client: ClientInfo,
  ) {
    return this.families.create(auth, dto, client);
  }

  @Auth()
  @Get()
  listMine(@CurrentAuth() auth: AuthContext) {
    return this.families.listMine(auth);
  }

  @FamilyAccess('VER_FAMILIA')
  @Get(':familiaUid')
  get(@CurrentFamily() scope: FamilyScope) {
    return this.families.get(scope);
  }

  // ─── Integrantes ───────────────────────────────────────────────────────────

  @FamilyAccess('VER_INTEGRANTES')
  @Get(':familiaUid/integrantes')
  listMembers(
    @CurrentFamily() scope: FamilyScope,
    @CurrentAuth() auth: AuthContext,
    @Query() query: ListMembersQueryDto,
  ) {
    return this.members.list(scope, auth, query);
  }

  @FamilyAccess('ALTERAR_PAPEL')
  @Patch(':familiaUid/integrantes/:integranteUid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeRole(
    @CurrentFamily() scope: FamilyScope,
    @CurrentAuth() auth: AuthContext,
    @Param('integranteUid', parseUid) integranteUid: string,
    @Body() dto: UpdateMemberDto,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.members.changeRole(scope, auth, integranteUid, dto, client);
  }

  @FamilyAccess('REMOVER_INTEGRANTE')
  @Delete(':familiaUid/integrantes/:integranteUid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @CurrentFamily() scope: FamilyScope,
    @CurrentAuth() auth: AuthContext,
    @Param('integranteUid', parseUid) integranteUid: string,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.members.remove(scope, auth, integranteUid, client);
  }

  // ─── Convites (administracao) ──────────────────────────────────────────────

  @FamilyAccess('CONVIDAR')
  @Post(':familiaUid/convites')
  issueInvite(
    @CurrentFamily() scope: FamilyScope,
    @CurrentAuth() auth: AuthContext,
    @Body() dto: IssueInviteDto,
    @Client() client: ClientInfo,
  ) {
    return this.invites.issue(scope, auth, dto, client);
  }

  @FamilyAccess('LISTAR_CONVITES')
  @Get(':familiaUid/convites')
  listInvites(
    @CurrentFamily() scope: FamilyScope,
    @Query() query: ListInvitesQueryDto,
  ) {
    return this.invites.list(scope, query);
  }

  @FamilyAccess('REVOGAR_CONVITE')
  @Post(':familiaUid/convites/:conviteUid/revogar')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeInvite(
    @CurrentFamily() scope: FamilyScope,
    @CurrentAuth() auth: AuthContext,
    @Param('conviteUid', parseUid) conviteUid: string,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.invites.revoke(scope, auth, conviteUid, client);
  }

  @FamilyAccess('CONVIDAR')
  @Post(':familiaUid/convites/:conviteUid/reenviar')
  @HttpCode(HttpStatus.ACCEPTED)
  async resendInvite(
    @CurrentFamily() scope: FamilyScope,
    @CurrentAuth() auth: AuthContext,
    @Param('conviteUid', parseUid) conviteUid: string,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.invites.resend(scope, auth, conviteUid, client);
  }

  // ─── Codigos de convite (administracao) ────────────────────────────────────

  /** O codigo em claro aparece so nesta resposta. */
  @FamilyAccess('CONVIDAR')
  @Post(':familiaUid/codigos-convite')
  issueInviteCode(
    @CurrentFamily() scope: FamilyScope,
    @CurrentAuth() auth: AuthContext,
    @Body() dto: IssueInviteCodeDto,
    @Client() client: ClientInfo,
  ) {
    return this.inviteCodes.issue(scope, auth, dto, client);
  }

  @FamilyAccess('LISTAR_CONVITES')
  @Get(':familiaUid/codigos-convite')
  listInviteCodes(@CurrentFamily() scope: FamilyScope) {
    return this.inviteCodes.list(scope);
  }

  @FamilyAccess('REVOGAR_CONVITE')
  @Post(':familiaUid/codigos-convite/:codigoUid/revogar')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeInviteCode(
    @CurrentFamily() scope: FamilyScope,
    @CurrentAuth() auth: AuthContext,
    @Param('codigoUid', parseUid) codigoUid: string,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.inviteCodes.revoke(scope, auth, codigoUid, client);
  }
}
