import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Client } from '../../common/http/client-info.decorator';
import type { ClientInfo } from '../../common/http/client-info.decorator';
import { CurrentAuth } from './decorators/current-auth.decorator';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import { Auth } from './guards/auth.guard';
import type { AuthContext, SessionView } from './auth.types';
import { AuthService } from './services/auth.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';
import { SessionCookieService } from './services/session-cookie.service';
import { SessionViewService } from './services/session-view.service';
import { SessionService } from './services/session.service';

/** Controller fino: apenas HTTP/cookies; toda regra esta nos servicos. */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly emailVerification: EmailVerificationService,
    private readonly passwordReset: PasswordResetService,
    private readonly sessions: SessionService,
    private readonly views: SessionViewService,
    private readonly cookies: SessionCookieService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.ACCEPTED)
  async register(@Body() dto: RegisterDto, @Client() client: ClientInfo) {
    await this.auth.register(dto, client);
    return { status: 'verification_pending' as const };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Client() client: ClientInfo,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionView> {
    const { session, view } = await this.auth.login(dto, client);
    this.cookies.write(response, session.token, session);
    return view;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Client() client: ClientInfo,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(this.cookies.read(request), client);
    this.cookies.clear(response);
  }

  /** Sempre 200: sem sessao valida devolve `auth_required` (nao e erro). */
  @Get('session')
  async session(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionView> {
    const token = this.cookies.read(request);
    const auth = token ? await this.sessions.resolve(token) : null;
    if (token && !auth) this.cookies.clear(response);
    return this.views.build(auth);
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Client() client: ClientInfo,
  ) {
    await this.passwordReset.requestReset(dto.email, client);
    return { status: 'instructions_sent_if_account_exists' as const };
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Client() client: ClientInfo,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.passwordReset.reset(dto.token, dto.senha, client);
    this.cookies.clear(response);
    return { status: 'password_reset' as const };
  }

  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto, @Client() client: ClientInfo) {
    await this.emailVerification.confirm(dto.token, client);
    return { status: 'email_verified' as const };
  }

  @Auth('session')
  @Post('email/resend')
  @HttpCode(HttpStatus.ACCEPTED)
  async resendVerification(
    @CurrentAuth() auth: AuthContext,
    @Client() client: ClientInfo,
  ) {
    return { status: await this.emailVerification.resend(auth, client) };
  }
}
