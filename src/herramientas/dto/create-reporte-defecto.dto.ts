import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateReporteDefectoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  observacion!: string;
}
