import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ActualizarActividadDiariaDto {
  @IsDateString(
    {},
    { message: 'Ingresa una fecha válida en formato AAAA-MM-DD.' },
  )
  @IsOptional()
  fecha?: string;

  @IsString({ message: 'Ingresa el nombre de la actividad.' })
  @IsNotEmpty({ message: 'Ingresa el nombre de la actividad.' })
  @MaxLength(150, {
    message: 'El nombre admite hasta 150 caracteres.',
  })
  nombre!: string;

  @IsString({ message: 'Ingresa la descripción de la actividad.' })
  @IsNotEmpty({ message: 'Ingresa la descripción de la actividad.' })
  @MaxLength(2000, {
    message: 'La descripción admite hasta 2000 caracteres.',
  })
  descripcion!: string;

  @IsString({ message: 'Las observaciones deben ser texto.' })
  @MaxLength(1000, {
    message: 'Las observaciones admiten hasta 1000 caracteres.',
  })
  @IsOptional()
  observaciones?: string;
}
