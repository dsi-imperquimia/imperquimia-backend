import { ArrayUnique, IsArray, IsInt, Min } from 'class-validator';

export class UpdateHabilidadesEmpleadoDto {
  @IsArray({ message: 'Las habilidades deben enviarse como una lista.' })
  @ArrayUnique({ message: 'No se puede asignar la misma habilidad dos veces.' })
  @IsInt({ each: true, message: 'Cada habilidad debe tener un ID entero.' })
  @Min(1, { each: true, message: 'Cada habilidad debe tener un ID positivo.' })
  habilidadesIds!: number[];
}
