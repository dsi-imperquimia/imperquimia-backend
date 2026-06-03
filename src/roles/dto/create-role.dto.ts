import { IsArray, IsString, MinLength } from 'class-validator';

export class CreateRoleDto {
  @IsString({
    message: 'El nombre del rol debe ser una cadena de texto',
  })
  @MinLength(3, {
    message: 'El nombre del rol debe tener al menos 3 caracteres',
  })
  name: string = '';

  @IsArray({
    message: 'Las permissions deben ser un arreglo de números',
  })
  permissions: number[] = [];
}
