import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateHabilidadeDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la habilidad es requerido' })
  @MaxLength(50, { message: 'El nombre no puede exceder los 50 caracteres' })
  nombre!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'La descripción no puede exceder los 255 caracteres' })
  descripcion?: string;
}


