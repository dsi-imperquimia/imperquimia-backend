import { PrioridadIncidencia } from '@gen/prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ActualizarIncidenciaDto {
  @IsOptional()
  @IsString({ message: 'Ingresa el título de la incidencia.' })
  @IsNotEmpty({ message: 'Ingresa el título de la incidencia.' })
  @MaxLength(150, { message: 'El título admite hasta 150 caracteres.' })
  titulo?: string;

  @IsOptional()
  @IsString({ message: 'Ingresa la descripción de la incidencia.' })
  @IsNotEmpty({ message: 'Ingresa la descripción de la incidencia.' })
  @MaxLength(2000, { message: 'La descripción admite hasta 2000 caracteres.' })
  descripcion?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Ingresa una fecha válida en formato AAAA-MM-DD.' },
  )
  fecha?: string;

  @IsOptional()
  @IsEnum(PrioridadIncidencia, {
    message: 'La prioridad debe ser BAJA, MEDIA, ALTA o CRITICA.',
  })
  prioridad?: PrioridadIncidencia;
}
