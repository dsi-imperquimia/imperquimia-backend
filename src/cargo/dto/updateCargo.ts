import { IsString } from "class-validator";

// DTO para actualizar un cargo
export class UpdateCargoDto {
  @IsString()
  nombre?: string;
}
