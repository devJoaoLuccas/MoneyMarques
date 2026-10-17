import { ParseUUIDPipe } from '@nestjs/common';
import { ApiErrors } from '../../../common/errors/api-exception';

/** UID invalido na rota e tratado como inexistente (404), sem pistas ao cliente. */
export const parseUid = new ParseUUIDPipe({
  exceptionFactory: () => ApiErrors.notFound(),
});
