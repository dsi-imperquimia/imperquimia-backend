import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsNotEmpty()
  unidad!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  costoUnitario!: number;

  @IsBoolean()
  @IsOptional()
  estado?: boolean;

  @IsString()
  @IsOptional()
  codigo?: string;

  @IsString()
  @IsOptional()
  fichaTecnica?: string;
}
