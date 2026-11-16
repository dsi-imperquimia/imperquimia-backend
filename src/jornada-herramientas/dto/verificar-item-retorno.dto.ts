import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  ESTADOS_VERIFICACION_ITEM,
  type EstadoVerificacionItemInput,
} from './verificar-item-inicio.dto';

export class VerificarItemRetornoDto {
  @IsIn(ESTADOS_VERIFICACION_ITEM, {
    message: 'El estado debe ser VERIFICADA o AUSENTE.',
  })
  estado!: EstadoVerificacionItemInput;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La observación admite hasta 500 caracteres.' })
  observacion?: string;
}
