import { IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { CreateEmpleadoDto } from './createEmpleado';
import { IsValidDui } from './validarDui';
import { IsValidNit } from './validarNit';

// DTO para actualizar campos del empleado. Todos son opcionales.
export class UpdateEmpleadoDto extends PartialType(CreateEmpleadoDto, {
  skipNullProperties: false,
}) {
  @IsOptional()
  @IsString()
  nombreCompleto?: string;

  @IsString()
  @IsValidDui()
  dui?: string;

  @IsString()
  @IsValidNit()
  nit?: string;

  @IsOptional()
  @IsInt()
  cargoId?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
