import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

/** Reemplaza el conjunto de incidencias vinculadas a una jornada. */
export class VincularIncidenciasDto {
  @IsArray({ message: 'Envía la lista de incidencias a vincular.' })
  @ArrayMaxSize(100, { message: 'Se admiten hasta 100 incidencias.' })
  @ArrayUnique({ message: 'La lista contiene incidencias repetidas.' })
  @Type(() => Number)
  @IsInt({
    each: true,
    message: 'Las incidencias deben ser identificadores válidos.',
  })
  @Min(1, {
    each: true,
    message: 'Las incidencias deben ser identificadores válidos.',
  })
  incidenciaIds!: number[];
}
