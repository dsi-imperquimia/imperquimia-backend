import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  MinLength,
  ValidateNested,
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

  @IsNumber(
    {},
    {
      message: 'La cantidad debe ser un número',
    },
  )
  @Min(0.01, {
    message: 'La cantidad debe ser mayor a 0',
  })
  cantidad: number;
}

export class CreateCotizacionDto {
  @IsString({
    message: 'La descripción debe ser una cadena de texto',
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
  cliente: string;
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
