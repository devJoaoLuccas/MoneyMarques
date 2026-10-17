import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ApiErrors } from '../errors/api-exception';
import { AuthConfig } from '../../config/auth.config';

export const CSRF_HEADER = 'x-csrf-protection';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Protecao CSRF (RN-AUTH-006) para a autenticacao por cookie:
 *  1. metodos que alteram estado exigem o header customizado
 *     `X-CSRF-Protection: 1` (um site de terceiros nao consegue envia-lo
 *     sem passar pelo preflight de CORS, que so libera a origem do frontend);
 *  2. quando o header Origin existe, ele deve ser a origem do frontend.
 * O cookie tambem usa SameSite=Lax.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly config: AuthConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    if (request.header(CSRF_HEADER) !== '1') throw ApiErrors.csrfRejected();

    const origin = request.header('origin');
    if (origin && origin !== this.config.frontendOrigin) {
      throw ApiErrors.csrfRejected();
    }
    return true;
  }
}
