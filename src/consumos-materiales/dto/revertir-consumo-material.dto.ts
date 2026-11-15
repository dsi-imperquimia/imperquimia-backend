import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class RevertirConsumoMaterialDto {
  @IsUUID('4', { message: 'La clave de reverso no es válida.' })
  claveOperacion!: string;

  @IsString()
  @MinLength(3, { message: 'Explica el motivo de la corrección.' })
  @MaxLength(500, {
    message: 'El motivo de corrección admite hasta 500 caracteres.',
  })
  motivo!: string;
}
