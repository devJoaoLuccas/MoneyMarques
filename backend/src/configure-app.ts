import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/errors/http-exception.filter';
import { createValidationPipe } from './common/errors/validation.pipe';
import { AuthConfig } from './config/auth.config';

/**
 * Configuracao HTTP compartilhada entre a aplicacao e os testes e2e:
 * prefixo, cookies, CORS restrito ao frontend, validacao e erros tipados.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(AuthConfig);

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: config.frontendOrigin,
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-CSRF-Protection'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
}
