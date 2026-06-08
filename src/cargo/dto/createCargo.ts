import { IsString } from "class-validator";

// DTO para crear un cargo
export class CreateCargoDto {
  @IsString()
  nombre!: string;
}
