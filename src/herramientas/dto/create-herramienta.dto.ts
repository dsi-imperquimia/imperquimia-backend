import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsPositive,
} from 'class-validator';
import { EstadoHerramienta } from '@gen/prisma/client';

export class CreateHerramientaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsInt()
  @IsPositive()
  marcaId!: number;

  @IsInt()
  @IsPositive()
  tipoId!: number;

  @IsEnum(EstadoHerramienta)
  @IsOptional()
  estado?: EstadoHerramienta;

  @IsInt()
  @IsOptional()
  proyectoId?: number;
}
