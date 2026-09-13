import { IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { UpdateHabilidadesEmpleadoDto } from './updateHabilidadesEmpleado';

// DTO para crear un empleado. Comentarios en español y validaciones básicas.
export class CreateEmpleadoDto extends PartialType(
  UpdateHabilidadesEmpleadoDto,
  {
    skipNullProperties: false,
  },
) {
  @IsString()
  // Nombre completo del empleado
  nombreCompleto!: string;

  @IsString()
  // DUI (documento único de identidad)
  dui!: string;

  @IsString()
  // NIT (número de identificación tributaria)
  nit!: string;

  @IsInt()
  // FK hacia la tabla cargos
  cargoId!: number;

  @IsOptional()
  @IsBoolean()
  // Si el empleado está activo (por defecto true)
  activo?: boolean;
}
