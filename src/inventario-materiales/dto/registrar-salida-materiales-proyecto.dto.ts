import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SalidaMaterialProyectoItemDto {
  @IsUUID('4', { message: 'La clave de operación no es válida.' })
  claveOperacion!: string;

  @Type(() => Number)
  @IsInt({ message: 'Selecciona un material válido.' })
  @Min(1, { message: 'Selecciona un material válido.' })
  materialId!: number;

  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad debe ser mayor que cero.' })
  @Max(9999999999, { message: 'La cantidad supera el máximo permitido.' })
  cantidad!: number;
}

export class RegistrarSalidaMaterialesProyectoDto {
  @Type(() => Number)
  @IsInt({ message: 'Selecciona un proyecto válido.' })
  @Min(1, { message: 'Selecciona un proyecto válido.' })
  proyectoId!: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'Agrega al menos un material.' })
  @ArrayMaxSize(50, { message: 'Solo puedes procesar 50 materiales a la vez.' })
  @ValidateNested({ each: true })
  @Type(() => SalidaMaterialProyectoItemDto)
  materiales!: SalidaMaterialProyectoItemDto[];

  @IsString()
  @MaxLength(500, { message: 'La observación admite hasta 500 caracteres.' })
  @IsOptional()
  observacion?: string;
}
