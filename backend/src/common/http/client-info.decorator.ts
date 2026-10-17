import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface ClientInfo {
  ip: string | null;
  userAgent: string | null;
  metodoHttp: string;
  rotaHttp: string;
}

const MAX_IP = 45;
const MAX_USER_AGENT = 1024;
const MAX_ROUTE = 255;

/** Dados da requisicao usados em sessao e auditoria. Nunca inclui query string. */
export const Client = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ClientInfo => {
    const request = context.switchToHttp().getRequest<Request>();
    return {
      ip: request.ip ? request.ip.slice(0, MAX_IP) : null,
      userAgent: request.header('user-agent')?.slice(0, MAX_USER_AGENT) ?? null,
      metodoHttp: request.method,
      rotaHttp: request.originalUrl.split('?')[0].slice(0, MAX_ROUTE),
    };
  },
);
