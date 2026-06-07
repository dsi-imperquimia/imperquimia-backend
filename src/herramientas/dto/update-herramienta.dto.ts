import { IsString, IsOptional } from 'class-validator';

export class UpdateHerramientaDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  marca?: string;

  @IsString()
  @IsOptional()
  tipo?: string;
}