import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthContext } from '../auth.types';
import type { AuthenticatedRequest } from '../guards/auth.guard';

/** Contexto autenticado da requisicao (disponivel em rotas com @Auth()). */
export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().auth,
);
