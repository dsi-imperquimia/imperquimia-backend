import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEmail,
  Matches,
  ValidateIf,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class DetalleProyectoDto {
  @IsInt() @Min(1) materialId!: number;
  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad debe ser mayor que cero.' })
  cantidad!: number;
}

export class CreateProyectoDto {
  @Transform(trim) @IsString() @IsNotEmpty() nombre!: string;
  @Transform(trim) @IsString() @IsNotEmpty() cliente!: string;
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaInicio!: string;
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaFin!: string;
  @IsOptional() @Transform(trim) @IsString() descripcion?: string;
  @IsOptional() @Transform(trim) @IsString() ubicacion?: string;
  @Transform(trim)
  @ValidateIf(
    (_obj, value) => value !== undefined && value !== null && value !== '',
  )
  @IsString()
  @Matches(/^\d{8}$/, {
    message: 'El teléfono debe contener exactamente 8 dígitos.',
  })
  phone?: string;
  @Transform(trim)
  @ValidateIf(
    (_obj, value) => value !== undefined && value !== null && value !== '',
  )
  @IsEmail()
  email?: string;
  @ValidateIf((_obj, value) => value !== undefined)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleProyectoDto)
  detalles?: DetalleProyectoDto[];
  @IsOptional() @IsInt() @Min(1) jefeProyectoId?: number;
}
