import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthConfig } from '../../../config/auth.config';

/**
 * Leitura/escrita do cookie de sessao (RN-AUTH-007): HttpOnly, SameSite=Lax,
 * Secure em producao (HTTPS obrigatorio) e prefixo __Host- em producao.
 * "Manter sessao" so define a duracao: sem ele o cookie vale ate fechar o
 * navegador (e o servidor ainda expira a sessao no TTL curto).
 */
@Injectable()
export class SessionCookieService {
  constructor(private readonly config: AuthConfig) {}

  read(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const value = cookies?.[this.config.sessionCookieName];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  write(
    response: Response,
    token: string,
    session: { expiraEm: Date; persistent: boolean },
  ): void {
    response.cookie(this.config.sessionCookieName, token, {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      path: '/',
      ...(session.persistent ? { expires: session.expiraEm } : {}),
    });
  }

  clear(response: Response): void {
    response.clearCookie(this.config.sessionCookieName, {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      path: '/',
    });
  }
}
