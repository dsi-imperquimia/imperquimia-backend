import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const ESTADOS_VERIFICACION_ITEM = ['VERIFICADA', 'AUSENTE'] as const;
export type EstadoVerificacionItemInput =
  (typeof ESTADOS_VERIFICACION_ITEM)[number];

export class VerificarItemInicioDto {
  @IsIn(ESTADOS_VERIFICACION_ITEM, {
    message: 'El estado debe ser VERIFICADA o AUSENTE.',
  })
  estado!: EstadoVerificacionItemInput;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La observación admite hasta 500 caracteres.' })
  observacion?: string;
}
