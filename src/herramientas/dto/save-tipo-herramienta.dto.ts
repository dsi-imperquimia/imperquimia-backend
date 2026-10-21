import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SaveTipoHerramientaDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(4, { message: 'El tipo debe tener al menos 4 caracteres' })
  @MaxLength(80)
  nombre!: string;
}
