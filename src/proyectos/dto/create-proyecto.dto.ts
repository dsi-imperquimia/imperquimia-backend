import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProyectoDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsOptional()
  ubicacion?: string;
}