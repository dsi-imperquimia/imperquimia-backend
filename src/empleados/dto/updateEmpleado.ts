import { IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateEmpleadoDto } from './createEmpleado';

// DTO para actualizar campos del empleado. Todos son opcionales.
export class UpdateEmpleadoDto extends PartialType(CreateEmpleadoDto, {
  skipNullProperties: false,
}) {
  @IsOptional()
  @IsString()
  nombreCompleto?: string;

  @IsOptional()
  @IsString()
  dui?: string;

  @IsOptional()
  @IsString()
  nit?: string;

  @IsOptional()
  @IsInt()
  cargoId?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
