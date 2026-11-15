import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsUUID, Min } from 'class-validator';

export class AbrirJornadaHerramientasDto {
  @IsUUID('4', { message: 'La clave de operación no es válida.' })
  claveOperacion!: string;

  @Type(() => Number)
  @IsInt({ message: 'Selecciona un proyecto válido.' })
  @Min(1, { message: 'Selecciona un proyecto válido.' })
  proyectoId!: number;

  @Type(() => Number)
  @IsInt({ message: 'Selecciona un técnico válido.' })
  @Min(1, { message: 'Selecciona un técnico válido.' })
  empleadoId!: number;

  @IsDateString(
    {},
    { message: 'Ingresa una fecha válida en formato AAAA-MM-DD.' },
  )
  fecha!: string;
}
