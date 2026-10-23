import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsInt,
  IsNumber,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
  MaxLength,
  Matches,
} from 'class-validator';
import { ArrayMinSize } from 'class-validator';

class CreateDetalleCotizacionDto {
  @IsNumber(
    {},
    {
      message: 'El material es obligatorio',
    },
  )
  @Min(1, {
    message: 'Debe seleccionar un material válido',
  })
  materialId: number;

  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, {
    message: 'La cantidad debe ser al menos 1',
  })
  @Max(1000, {
    message: 'La cantidad no puede superar 1000.',
  })
  cantidad: number;
}

export class CreateCotizacionDto {
  @IsNotEmpty({
    message: 'La descripción es obligatoria',
  })
  @IsString({
    message: 'La descripción debe ser una cadena de texto',
  })
  @MinLength(10, {
    message: 'La descripción debe tener al menos 10 caracteres',
  })
  @MaxLength(255, {
    message: 'La descripción no puede superar los 255 caracteres',
  })
  descripcion: string;

  @IsString({
    message: 'El nombre del cliente debe ser una cadena de texto',
  })
  @IsNotEmpty({
    message: 'El nombre del cliente es obligatorio',
  })
  @MinLength(3, {
    message: 'El nombre del cliente debe tener al menos 3 caracteres',
  })
  @MaxLength(100, {
    message: 'El nombre del cliente no puede superar los 100 caracteres',
  })
  cliente: string;

  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @Matches(/^\d{8}$/, {
    message: 'El teléfono debe tener exactamente 8 dígitos',
  })
  phone: string;

  @IsEmail({}, { message: 'Debe ingresar un correo válido con @ y dominio' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  @MaxLength(150, { message: 'El correo no puede superar los 150 caracteres' })
  email: string;

  @IsArray({
    message: 'Los detalles deben enviarse en formato de arreglo',
  })
  @ArrayMinSize(1, {
    message: 'Debe agregar al menos un material a la cotización',
  })
  @ValidateNested({
    each: true,
  })
  @Type(() => CreateDetalleCotizacionDto)
  detalles: CreateDetalleCotizacionDto[];
}
