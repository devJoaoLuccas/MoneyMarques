import { HttpStatus } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { ApiErrorBody, ApiErrorCode } from './api-exception';

/**
 * Traducao de falhas "de infraestrutura" (framework, leitura do corpo, banco)
 * para mensagens legiveis em portugues. Nada tecnico sai daqui: a mensagem
 * original (stack, SQL, nome de tabela/campo) fica apenas no log do servidor.
 */
type Friendly = Pick<ApiErrorBody, 'statusCode' | 'code' | 'message'>;

export const GENERIC_ERROR: Friendly = {
  statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  code: 'INTERNAL_ERROR',
  message: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
};

const UNAVAILABLE: Friendly = {
  statusCode: HttpStatus.SERVICE_UNAVAILABLE,
  code: 'SERVICE_UNAVAILABLE',
  message:
    'O serviço está temporariamente indisponível. Tente novamente em instantes.',
};

const BY_STATUS: Partial<
  Record<number, { code: ApiErrorCode; message: string }>
> = {
  [HttpStatus.BAD_REQUEST]: {
    code: 'BAD_REQUEST',
    message:
      'Não foi possível entender os dados enviados. Revise e tente novamente.',
  },
  [HttpStatus.UNAUTHORIZED]: {
    code: 'UNAUTHENTICATED',
    message: 'Sua sessão expirou. Entre novamente para continuar.',
  },
  [HttpStatus.FORBIDDEN]: {
    code: 'FORBIDDEN',
    message: 'Você não tem permissão para fazer isso.',
  },
  [HttpStatus.NOT_FOUND]: {
    code: 'NOT_FOUND',
    message: 'Não encontramos o que você procurou.',
  },
  [HttpStatus.METHOD_NOT_ALLOWED]: {
    code: 'BAD_REQUEST',
    message: 'Esta ação não está disponível.',
  },
  [HttpStatus.CONFLICT]: {
    code: 'CONFLICT',
    message:
      'Não foi possível concluir porque algo mudou. Atualize a tela e tente de novo.',
  },
  [HttpStatus.PAYLOAD_TOO_LARGE]: {
    code: 'PAYLOAD_TOO_LARGE',
    message: 'Os dados enviados são grandes demais.',
  },
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: {
    code: 'BAD_REQUEST',
    message: 'Formato de dados não suportado.',
  },
  [HttpStatus.TOO_MANY_REQUESTS]: {
    code: 'TOO_MANY_ATTEMPTS',
    message: 'Muitas tentativas. Aguarde um pouco e tente novamente.',
  },
};

/** Mensagem amigavel para um status HTTP; 5xx e status sem texto proprio viram genericos. */
export function friendlyForStatus(status: number): Friendly {
  const known = BY_STATUS[status];
  if (known) return { statusCode: status, ...known };
  if (status >= 500) return status === 503 ? UNAVAILABLE : GENERIC_ERROR;
  return {
    statusCode: status,
    code: 'BAD_REQUEST',
    message:
      'Não foi possível concluir a ação. Revise os dados e tente novamente.',
  };
}

/** Codigos Prisma de banco inacessivel ou sobrecarregado. */
const DB_UNAVAILABLE = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);
/** Codigos de rede do driver (pg/Node) com o mesmo significado. */
const NET_UNAVAILABLE = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  '57P01',
  '53300',
]);

/** Traduz erros do banco; devolve `null` se nao for um erro de banco conhecido. */
export function friendlyForDatabaseError(error: unknown): Friendly | null {
  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return UNAVAILABLE;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (DB_UNAVAILABLE.has(error.code)) return UNAVAILABLE;
    switch (error.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          code: 'CONFLICT',
          message: 'Este registro já existe.',
        };
      case 'P2003':
      case 'P2014':
        return {
          statusCode: HttpStatus.CONFLICT,
          code: 'CONFLICT',
          message:
            'Não foi possível concluir porque há outros dados ligados a este registro.',
        };
      case 'P2025':
        return friendlyForStatus(HttpStatus.NOT_FOUND);
      case 'P2034':
        return {
          statusCode: HttpStatus.CONFLICT,
          code: 'CONFLICT',
          message: 'Muita gente alterou isso ao mesmo tempo. Tente novamente.',
        };
      case 'P2000':
      case 'P2005':
      case 'P2006':
      case 'P2007':
        return friendlyForStatus(HttpStatus.BAD_REQUEST);
      default:
        return GENERIC_ERROR;
    }
  }
  if (error instanceof Prisma.PrismaClientValidationError) return GENERIC_ERROR;
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && NET_UNAVAILABLE.has(code)) return UNAVAILABLE;
  return null;
}

/**
 * Erros de middleware (body-parser etc.) trazem `status`/`statusCode` numerico
 * e mensagem tecnica em ingles ("Unexpected token", "request entity too large").
 */
export function statusOfHttpLikeError(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null;
  const { status, statusCode } = error as {
    status?: unknown;
    statusCode?: unknown;
  };
  const value = typeof status === 'number' ? status : statusCode;
  return typeof value === 'number' && value >= 400 && value < 600
    ? value
    : null;
}
