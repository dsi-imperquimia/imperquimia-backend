import { CreateCotizacionDto } from './create-cotizacion.dto';
import { EstadoCotizacion } from '@gen/prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateCotizacionDto extends CreateCotizacionDto {
  @IsEnum(EstadoCotizacion, {
    message: 'El estado debe ser ACTIVA o DESACTIVADA',
  })
  estado: EstadoCotizacion;
}
