import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiErrorBody, ApiErrorCode } from './api-exception';

const DEFAULT_CODES: Partial<Record<number, ApiErrorCode>> = {
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
};

/**
 * Normaliza todas as respostas de erro para ApiErrorBody e nunca vaza
 * detalhes internos (stack, mensagens de banco) para o cliente.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);

    if (body.retryAfterSeconds) {
      response.setHeader('Retry-After', String(body.retryAfterSeconds));
    }
    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'code' in payload
      ) {
        return payload as ApiErrorBody;
      }
      return {
        statusCode: status,
        code: DEFAULT_CODES[status] ?? 'INTERNAL_ERROR',
        message: exception.message,
      };
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
    };
  }
}
