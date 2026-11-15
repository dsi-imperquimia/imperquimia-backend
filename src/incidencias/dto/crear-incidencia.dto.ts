import { PrioridadIncidencia } from '@gen/prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CrearIncidenciaDto {
  @IsUUID('4', { message: 'La clave de operación no es válida.' })
  claveOperacion!: string;

  @Type(() => Number)
  @IsInt({ message: 'Selecciona un proyecto válido.' })
  @Min(1, { message: 'Selecciona un proyecto válido.' })
  proyectoId!: number;

  @IsString({ message: 'Ingresa el título de la incidencia.' })
  @IsNotEmpty({ message: 'Ingresa el título de la incidencia.' })
  @MaxLength(150, { message: 'El título admite hasta 150 caracteres.' })
  titulo!: string;

  @IsString({ message: 'Ingresa la descripción de la incidencia.' })
  @IsNotEmpty({ message: 'Ingresa la descripción de la incidencia.' })
  @MaxLength(2000, { message: 'La descripción admite hasta 2000 caracteres.' })
  descripcion!: string;

  @IsDateString(
    {},
    { message: 'Ingresa una fecha válida en formato AAAA-MM-DD.' },
  )
  fecha!: string;

  @IsOptional()
  @IsEnum(PrioridadIncidencia, {
    message: 'La prioridad debe ser BAJA, MEDIA, ALTA o CRITICA.',
  })
  prioridad?: PrioridadIncidencia;
}
