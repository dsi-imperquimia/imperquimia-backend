import { IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';

// DTO para actualizar campos del empleado. Todos son opcionales.
export class UpdateEmpleadoDto {
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
