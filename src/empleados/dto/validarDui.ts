import { ValidateBy } from 'class-validator';

export function isValidDui(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{8}-\d$/.test(value)) {
    return false;
  }

  const digits = value.replace('-', '').split('').map(Number);
  const sum = digits
    .slice(0, 8)
    .reduce((acc, digit, index) => acc + digit * (9 - index), 0);
  const checkDigit = (10 - (sum % 10)) % 10;

  return checkDigit === digits[8];
}

export const IsValidDui = () =>
  ValidateBy({
    name: 'isValidDui',
    validator: {
      validate: isValidDui,
      defaultMessage: () =>
        'El DUI debe tener formato 00000000-0 y un dígito verificador válido.',
    },
  });
