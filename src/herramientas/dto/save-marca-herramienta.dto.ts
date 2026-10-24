import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SaveMarcaHerramientaDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(4, { message: 'La marca debe tener al menos 4 caracteres' })
  @MaxLength(100)
  nombre!: string;
}
