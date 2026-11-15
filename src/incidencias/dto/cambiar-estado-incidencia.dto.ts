import { EstadoIncidencia } from '@gen/prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CambiarEstadoIncidenciaDto {
  @IsEnum(EstadoIncidencia, {
    message: 'El estado debe ser ABIERTA, EN_PROCESO o RESUELTA.',
  })
  estado!: EstadoIncidencia;

  @IsOptional()
  @IsString({ message: 'El comentario debe ser texto.' })
  @MaxLength(500, { message: 'El comentario admite hasta 500 caracteres.' })
  comentario?: string;
}
