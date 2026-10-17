import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ApiErrors } from '../../../common/errors/api-exception';
import { AuthContext } from '../auth.types';
import { SessionCookieService } from '../services/session-cookie.service';
import { SessionService } from '../services/session.service';

/**
 * - 'session': qualquer sessao valida (inclui MFA pendente / e-mail pendente).
 * - 'full': sessao totalmente autenticada. Use em TODA rota de dados privados.
 */
export type AuthRequirement = 'session' | 'full';

const AUTH_REQUIREMENT_KEY = 'auth:requirement';

export type AuthenticatedRequest = Request & { auth: AuthContext };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    private readonly cookies: SessionCookieService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const requirement =
      this.reflector.getAllAndOverride<AuthRequirement>(AUTH_REQUIREMENT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'full';

    const token = this.cookies.read(request);
    const auth = token ? await this.sessions.resolve(token) : null;
    if (!auth) throw ApiErrors.unauthenticated();

    if (requirement === 'full') {
      if (auth.status === 'email_verification_required') {
        throw ApiErrors.emailVerificationRequired();
      }
      if (auth.status === 'mfa_required') throw ApiErrors.mfaRequired();
    }

    request.auth = auth;
    return true;
  }
}

/** Protege a rota. Sem argumento exige sessao completa (padrao seguro). */
export const Auth = (requirement: AuthRequirement = 'full') =>
  applyDecorators(
    SetMetadata(AUTH_REQUIREMENT_KEY, requirement),
    UseGuards(AuthGuard),
  );
