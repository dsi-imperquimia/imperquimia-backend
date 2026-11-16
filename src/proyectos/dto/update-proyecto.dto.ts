import { PartialType } from '@nestjs/mapped-types';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { CreateProyectoDto } from './create-proyecto.dto';

// Estados que se pueden asignar desde la edición general del proyecto.
// Cancelar desde aquí exige motivo y notifica igual que el flujo dedicado
// (GPRCIMPER-28): ver ProyectoService.cancelar/notificarCancelacion.
export const ESTADOS_EDITABLES = [
  'ACTIVO',
  'EN_PAUSA',
  'FINALIZADO',
  'PAGADO',
  'GARANTIA',
  'CANCELADO',
] as const;
export const TIPOS_OBRA = [
  'RESIDENCIAL',
  'COMERCIAL',
  'INDUSTRIAL',
  'INFRAESTRUCTURA',
  'OTRO',
] as const;

export class UpdateProyectoDto extends PartialType(CreateProyectoDto) {
  @IsOptional()
  @IsIn(ESTADOS_EDITABLES)
  estado?: (typeof ESTADOS_EDITABLES)[number];
  @IsOptional() @IsIn(TIPOS_OBRA) tipoObra?: (typeof TIPOS_OBRA)[number];
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) presupuesto?: number;
  // Obligatorio solo cuando estado se envía como CANCELADO (GPRCIMPER-28).
  @ValidateIf((dto) => dto.estado === 'CANCELADO')
  @IsString()
  @IsNotEmpty()
  motivo?: string;
}
