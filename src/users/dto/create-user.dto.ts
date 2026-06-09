import {
  IsArray,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString({
    message: 'El nombre debe ser una cadena de texto',
  })
  name: string = '';

  @IsString({
    message: 'El apellido debe ser una cadena de texto',
  })
  lastName: string = '';

  @IsEmail(undefined, {
    message: 'El correo electrónico no es válido',
  })
  email: string = '';

  @IsString({
    message: 'La contraseña debe ser una cadena de texto',
  })
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres',
  })
  password: string = '';

  @IsNumber(
    {},
    {
      message: 'El role es obligatorio',
    },
  )
  roleId: number = 0;

  @IsOptional()
  @IsArray({
    message: 'Las permissions deben ser un arreglo de números',
  })
  permissionsIds?: number[] = [];
}
