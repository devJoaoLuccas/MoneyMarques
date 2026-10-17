import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Client } from '../../common/http/client-info.decorator';
import type { ClientInfo } from '../../common/http/client-info.decorator';
import type { AuthContext, SessionView } from './auth.types';
import { CurrentAuth } from './decorators/current-auth.decorator';
import { MfaCodeDto, MfaDisableDto, MfaEnableDto } from './dto/auth.dto';
import { Auth } from './guards/auth.guard';
import { MfaService } from './services/mfa.service';
import { SessionCookieService } from './services/session-cookie.service';
import { SessionViewService } from './services/session-view.service';
import { SessionService } from './services/session.service';

@Controller('auth/mfa')
export class MfaController {
  constructor(
    private readonly mfa: MfaService,
    private readonly sessions: SessionService,
    private readonly views: SessionViewService,
    private readonly cookies: SessionCookieService,
  ) {}

  /** Inicia o enrolamento: devolve o segredo e a URI do QR code (unica exibicao). */
  @Auth('full')
  @Post('setup')
  @HttpCode(HttpStatus.OK)
  setup(@CurrentAuth() auth: AuthContext, @Client() client: ClientInfo) {
    return this.mfa.startSetup(auth, client);
  }

  @Auth('full')
  @Post('enable')
  @HttpCode(HttpStatus.OK)
  enable(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: MfaEnableDto,
    @Client() client: ClientInfo,
  ) {
    return this.mfa.enable(auth, dto.codigo, client);
  }

  /** Desafio da sessao com MFA pendente (AUTH-004). */
  @Auth('session')
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: MfaCodeDto,
    @Client() client: ClientInfo,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionView> {
    const issued = await this.mfa.completeChallenge(auth, dto, client);
    if (!issued) return this.views.build(auth);

    this.cookies.write(response, issued.token, issued);
    return this.views.build(await this.sessions.resolve(issued.token));
  }

  @Auth('full')
  @Post('disable')
  @HttpCode(HttpStatus.OK)
  async disable(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: MfaDisableDto,
    @Client() client: ClientInfo,
  ) {
    await this.mfa.disable(auth, dto, client);
    return { status: 'mfa_disabled' as const };
  }
}
