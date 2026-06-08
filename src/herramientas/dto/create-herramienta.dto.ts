import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt } from 'class-validator';
import { EstadoHerramienta } from '@gen/prisma/client';

export class CreateHerramientaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  marca!: string;

  @IsString()
  @IsNotEmpty()
  tipo!: string;

  @IsEnum(EstadoHerramienta)
  @IsOptional()
  estado?: EstadoHerramienta;

  @IsInt()
  @IsOptional()
  proyectoId?: number;
}