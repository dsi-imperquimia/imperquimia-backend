import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CrearNotificacionAlertaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  proyectoId!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  descripcion!: string;

  @IsBoolean()
  todosAsignados!: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  empleadoIds?: number[];
}
