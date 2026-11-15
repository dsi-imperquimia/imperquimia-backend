import { IsNotEmpty, IsString } from 'class-validator';

export class CancelarProyectoDto {
  @IsString() @IsNotEmpty() motivo!: string;
}
