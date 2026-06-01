import { IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';

// DTO para actualizar campos del empleado. Todos son opcionales.
export class UpdateEmpleadoDto {
  @IsOptional()
  @IsString()
  nombre_completo?: string;

  @IsOptional()
  @IsString()
  dui?: string;

  @IsOptional()
  @IsString()
  nit?: string;

  @IsOptional()
  @IsInt()
  id_cargo?: number;

  @IsOptional()
  @IsInt()
  id_rol?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
