import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsNumber, IsOptional, Min } from 'class-validator';
import { CreateProyectoDto } from './create-proyecto.dto';

// Estados que se pueden asignar desde la edición general del proyecto.
// CANCELADO solo se asigna a través del flujo dedicado de cancelación (GPRCIMPER-28).
export const ESTADOS_EDITABLES = [
  'ACTIVO',
  'EN_PAUSA',
  'FINALIZADO',
  'PAGADO',
  'GARANTIA',
] as const;
export const TIPOS_OBRA = [
  'RESIDENCIAL',
  'COMERCIAL',
  'INDUSTRIAL',
  'INFRAESTRUCTURA',
  'OTRO',
] as const;

export class UpdateProyectoDto extends PartialType(CreateProyectoDto) {
  @IsOptional() @IsIn(ESTADOS_EDITABLES) estado?: (typeof ESTADOS_EDITABLES)[number];
  @IsOptional() @IsIn(TIPOS_OBRA) tipoObra?: (typeof TIPOS_OBRA)[number];
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) presupuesto?: number;
}
