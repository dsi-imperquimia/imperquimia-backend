import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEmail, Matches, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class CreateProyectoDto {
  @Transform(trim) @IsString() @IsNotEmpty() nombre!: string;
  @Transform(trim) @IsString() @IsNotEmpty() cliente!: string;
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) fechaInicio!: string;
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) fechaFin!: string;
  @IsOptional() @Transform(trim) @IsString() descripcion?: string;
  @IsOptional() @Transform(trim) @IsString() ubicacion?: string;
  @IsOptional() @Transform(trim) @IsString() phone?: string;
  @Transform(trim) @ValidateIf((_obj, value) => value !== undefined && value !== null && value !== '') @IsEmail() email?: string;
}
