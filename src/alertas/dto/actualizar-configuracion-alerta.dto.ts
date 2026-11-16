import { PartialType } from '@nestjs/mapped-types';
import { CrearConfiguracionAlertaDto } from './crear-configuracion-alerta.dto';

export class ActualizarConfiguracionAlertaDto extends PartialType(
  CrearConfiguracionAlertaDto,
) {}
