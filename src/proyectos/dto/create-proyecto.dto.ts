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
  IsNumber,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class DetalleProyectoDto {
  @IsInt() @Min(1) materialId!: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) cantidad!: number;
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
}
