import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

function formatErrors(errors: ValidationError[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  errors.forEach((error) => {
    if (error.constraints) {
      result[error.property] = Object.values(error.constraints);
    }

    if (error.children && error.children.length > 0) {
      Object.assign(result, formatErrors(error.children));
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
