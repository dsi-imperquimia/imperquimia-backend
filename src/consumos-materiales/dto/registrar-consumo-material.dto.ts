import { ClasificacionConsumoMaterial } from '@gen/prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class RegistrarConsumoMaterialDto {
  @IsUUID('4', { message: 'La clave de operación no es válida.' })
  claveOperacion!: string;

  @Type(() => Number)
  @IsInt({ message: 'Selecciona un proyecto válido.' })
  @Min(1, { message: 'Selecciona un proyecto válido.' })
  proyectoId!: number;

  @Type(() => Number)
  @IsInt({ message: 'Selecciona un material válido.' })
  @Min(1, { message: 'Selecciona un material válido.' })
  materialId!: number;

  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad debe ser mayor que cero.' })
  @Max(9999999999, { message: 'La cantidad supera el máximo permitido.' })
  cantidad!: number;

  @IsEnum(ClasificacionConsumoMaterial, {
    message: 'Selecciona una clasificación válida.',
  })
  clasificacion!: ClasificacionConsumoMaterial;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de jornada debe tener formato AAAA-MM-DD.',
  })
  fechaJornada!: string;

  @IsString()
  @MaxLength(500, { message: 'El motivo admite hasta 500 caracteres.' })
  @IsOptional()
  motivo?: string;

  @IsString()
  @MaxLength(100, { message: 'La referencia admite hasta 100 caracteres.' })
  @IsOptional()
  actividadReferencia?: string;

  @IsString()
  @MaxLength(100, { message: 'La referencia admite hasta 100 caracteres.' })
  @IsOptional()
  reporteReferencia?: string;
}
