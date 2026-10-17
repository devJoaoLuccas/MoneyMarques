import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiErrorBody } from './api-exception';
import {
  friendlyForDatabaseError,
  friendlyForStatus,
  GENERIC_ERROR,
  statusOfHttpLikeError,
} from './error-messages';

/**
 * Normaliza todas as respostas de erro para ApiErrorBody em portugues e nunca
 * vaza detalhes internos (stack, SQL, nomes de tabela/campo, mensagens do
 * framework) para o cliente. O detalhe tecnico vai somente para o log.
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
      const payload = exception.getResponse();
      // Erros da aplicacao (ApiException) ja trazem codigo e texto para o usuario.
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'code' in payload
      ) {
        return payload as ApiErrorBody;
      }
      // Excecoes do proprio framework ("Cannot GET /x", "Forbidden resource"...):
      // o texto original e tecnico e em ingles, entao e trocado por um amigavel.
      const status = exception.getStatus();
      this.log(exception, status);
      return friendlyForStatus(status);
    }

    const database = friendlyForDatabaseError(exception);
    if (database) {
      this.log(exception, database.statusCode);
      return database;
    }

    // Erros de middleware (corpo JSON malformado, corpo grande demais...).
    const status = statusOfHttpLikeError(exception);
    if (status !== null) {
      this.log(exception, status);
      return friendlyForStatus(status);
    }

    this.log(exception, GENERIC_ERROR.statusCode);
    return GENERIC_ERROR;
  }

  /** Detalhe tecnico so no log do servidor; 4xx sao ruido esperado, entao so um aviso curto. */
  private log(exception: unknown, status: number): void {
    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `${status} ${exception instanceof Error ? exception.message : String(exception)}`,
      );
    }
  }
}
