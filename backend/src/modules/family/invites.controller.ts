import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Client } from '../../common/http/client-info.decorator';
import type { ClientInfo } from '../../common/http/client-info.decorator';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator';
import { Auth } from '../auth/guards/auth.guard';
import type { AuthContext } from '../auth/auth.types';
import { parseUid } from './decorators/parse-uid.pipe';
import { InviteTokenDto } from './dto/family.dto';
import { InvitesService } from './services/invites.service';

/**
 * Respostas a convites pelo destinatario autenticado. O token viaja no corpo
 * (nunca na URL) para nao ser gravado em logs/auditoria da rota (AUTH-003).
 */
@Auth()
@Controller('convites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post('previa')
  @HttpCode(HttpStatus.OK)
  preview(@CurrentAuth() auth: AuthContext, @Body() dto: InviteTokenDto) {
    return this.invites.preview(auth, dto.token);
  }

  @Post('aceitar')
  @HttpCode(HttpStatus.OK)
  accept(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: InviteTokenDto,
    @Client() client: ClientInfo,
  ) {
    return this.invites.acceptByToken(auth, dto.token, client);
  }

  @Post('recusar')
  @HttpCode(HttpStatus.NO_CONTENT)
  async decline(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: InviteTokenDto,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.invites.declineByToken(auth, dto.token, client);
  }

  /** Convites listados na sessao (conhece so o uid): mesma regra de e-mail do convite. */
  @Post('pendentes/:conviteUid/aceitar')
  @HttpCode(HttpStatus.OK)
  acceptPending(
    @CurrentAuth() auth: AuthContext,
    @Param('conviteUid', parseUid) conviteUid: string,
    @Client() client: ClientInfo,
  ) {
    return this.invites.acceptPending(auth, conviteUid, client);
  }

  @Post('pendentes/:conviteUid/recusar')
  @HttpCode(HttpStatus.NO_CONTENT)
  async declinePending(
    @CurrentAuth() auth: AuthContext,
    @Param('conviteUid', parseUid) conviteUid: string,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.invites.declinePending(auth, conviteUid, client);
  }
}
