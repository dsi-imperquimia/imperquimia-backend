import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

function formatErrors(
  errors: ValidationError[],
  prefix = '',
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  errors.forEach((error) => {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    if (error.constraints) {
      result[path] = Object.values(error.constraints);
      // Conserva la clave anterior para formularios que aún usan errores planos.
      if (prefix) result[error.property] = result[path];
    }

    if (error.children && error.children.length > 0) {
      Object.assign(result, formatErrors(error.children, path));
    }
  });

  return result;
}

export function validationExceptionFactory(errors: ValidationError[]) {
  return new BadRequestException({
    message: formatErrors(errors),
    error: 'Bad Request',
    statusCode: 400,
  });
}
