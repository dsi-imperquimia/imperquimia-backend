import { SetMetadata } from '@nestjs/common';

export const ALERTAS_PERMISSION_KEY = 'alertasPermission';
export const AlertasPermission = (permission: string) =>
  SetMetadata(ALERTAS_PERMISSION_KEY, permission);
