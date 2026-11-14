import { MotivoMovimientoMaterial } from '@gen/prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class RegistrarMovimientoMaterialDto {
  @IsUUID('4', { message: 'La clave de operación no es válida.' })
  claveOperacion!: string;

  @Type(() => Number)
  @IsInt({ message: 'Selecciona un material válido.' })
  @Min(1, { message: 'Selecciona un material válido.' })
  materialId!: number;

  // @Min(1) reemplaza al CHECK (cantidad > 0) que tenía la migración: se
  // valida aquí, antes de llegar a la base.
  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad debe ser mayor que cero.' })
  @Max(9999999999, { message: 'La cantidad supera el máximo permitido.' })
  cantidad!: number;

  @IsEnum(MotivoMovimientoMaterial, { message: 'Selecciona un motivo válido.' })
  motivo!: MotivoMovimientoMaterial;

  @Type(() => Number)
  @IsInt({ message: 'Selecciona un proyecto válido.' })
  @Min(1, { message: 'Selecciona un proyecto válido.' })
  @IsOptional()
  proyectoId?: number;

  @IsString()
  @MaxLength(500, { message: 'La observación admite hasta 500 caracteres.' })
  @IsOptional()
  observacion?: string;
}
