import { OmitType } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends OmitType(CreateUserDto, [
  'password',
] as const) {
  // 2. Los volvemos a declarar, pero ahora como opcionales
  @IsOptional()
  @IsString({
    message: 'La contraseña debe ser una cadena de texto',
  })
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres',
  })
  password?: string;

  @IsOptional()
  @IsArray({
    message: 'Las permissions deben ser un arreglo de números',
  })
  permissionsIds?: number[];
}
