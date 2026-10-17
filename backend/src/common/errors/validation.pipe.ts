import { ValidationError, ValidationPipe } from '@nestjs/common';
import { ApiErrors, FieldErrors } from './api-exception';

function collect(
  errors: ValidationError[],
  parent: string,
  out: FieldErrors,
): void {
  for (const error of errors) {
    const path = parent ? `${parent}.${error.property}` : error.property;
    if (error.constraints) {
      out[path] = Object.values(error.constraints);
    }
    if (error.children?.length) collect(error.children, path, out);
  }
}

/** ValidationPipe global: whitelist estrita e erros por campo (CA-002). */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: false,
    exceptionFactory: (errors) => {
      const fieldErrors: FieldErrors = {};
      collect(errors, '', fieldErrors);
      return ApiErrors.validation(fieldErrors);
    },
  });
}
