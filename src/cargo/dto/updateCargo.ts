import {IsString} from "class-validator";

export class UpdateCargoDto {
  @IsString()
  nombre_cargo?: string;
}
