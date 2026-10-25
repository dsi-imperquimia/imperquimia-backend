import { ValidateBy } from 'class-validator';
import { isValidDui } from './validarDui';

function isValidNit(value: unknown): boolean {
  return (
    isValidDui(value) ||
    (typeof value === 'string' && /^\d{4}-\d{6}-\d{3}-\d$/.test(value))
  );
}

export const IsValidNit = () =>
  ValidateBy({
    name: 'isValidNit',
    validator: {
      validate: isValidNit,
      defaultMessage: () =>
        'El NIT debe tener formato 00000000-0 con dígito verificador válido o 0000-000000-000-0.',
    },
  });
