import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { AreaMovimiento } from '@gen/prisma/client';

export class CreateMovimientoDto {
  @IsInt()
  herramientaId!: number;

  @IsEnum(AreaMovimiento)
  origen!: AreaMovimiento;

  @IsEnum(AreaMovimiento)
  destino!: AreaMovimiento;

  // Solo obligatorio cuando destino === PROYECTO, se valida en el servicio
  @IsInt()
  @IsOptional()
  proyectoDestinoId?: number;

  // Si llega dañada al destino, el estado final será DANADA en vez del default
  @IsBoolean()
  @IsOptional()
  conDano?: boolean;

  @IsString()
  @IsOptional()
  observaciones?: string;
}