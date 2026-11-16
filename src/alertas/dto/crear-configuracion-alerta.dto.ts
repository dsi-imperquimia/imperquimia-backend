import { CanalAlerta, FrecuenciaAlerta } from '@gen/prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CrearConfiguracionAlertaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  proyectoId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  diasAntes!: number;

  @IsOptional()
  @IsEnum(CanalAlerta)
  canal?: CanalAlerta;

  @IsEnum(FrecuenciaAlerta)
  frecuencia!: FrecuenciaAlerta;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  cadaNDias?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(7)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  diasEspecificos?: number[];

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
