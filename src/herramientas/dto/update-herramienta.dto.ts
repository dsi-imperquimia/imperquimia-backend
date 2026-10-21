import { IsInt, IsPositive, IsString, IsOptional } from 'class-validator';

export class UpdateHerramientaDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  marcaId?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  tipoId?: number;
}
