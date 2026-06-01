import { IsString } from "class-validator";

export class CreateCargoDto {
  @IsString()
  nombre_cargo!: string;
}
