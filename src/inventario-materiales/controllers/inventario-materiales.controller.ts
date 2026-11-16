import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/decorators/current-user.decorator';
import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RegistrarMovimientoMaterialDto } from '../dto/registrar-movimiento-material.dto';
import { RegistrarSalidaMaterialesProyectoDto } from '../dto/registrar-salida-materiales-proyecto.dto';
import {
  InventarioPermissions,
  InventarioPermissionsGuard,
} from '../guards/inventario-permissions.guard';
import { InventarioMaterialesService } from '../service/inventario-materiales.service';

@Controller('inventario-materiales')
@UseGuards(InventarioPermissionsGuard)
export class InventarioMaterialesController {
  constructor(private readonly service: InventarioMaterialesService) {}

  @Get('existencias')
  @InventarioPermissions('INVENTARIO_MATERIAL_READ')
  findExistencias(
    @Query('materialId', new ParseIntPipe({ optional: true }))
    materialId?: number,
    @Query('proyectoId', new ParseIntPipe({ optional: true }))
    proyectoId?: number,
  ) {
    return this.service.findExistencias(materialId, proyectoId);
  }

  @Get('movimientos')
  @InventarioPermissions('INVENTARIO_MATERIAL_READ')
  findMovimientos(@Query() query: Record<string, string | undefined>) {
    return this.service.findMovimientos(query);
  }

  @Post('entradas')
  @InventarioPermissions('INVENTARIO_MATERIAL_ENTRY')
  registrarEntrada(
    @Body() dto: RegistrarMovimientoMaterialDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.registrarEntrada(dto, user.sub);
  }

  @Post('salidas')
  @InventarioPermissions('INVENTARIO_MATERIAL_EXIT')
  registrarSalida(
    @Body() dto: RegistrarMovimientoMaterialDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.registrarSalida(dto, user.sub);
  }

  @Post('salidas/proyecto')
  @InventarioPermissions('INVENTARIO_MATERIAL_EXIT')
  registrarSalidasProyecto(
    @Body() dto: RegistrarSalidaMaterialesProyectoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.registrarSalidasProyecto(dto, user.sub);
  }

  @Post('entradas/proyecto')
  @InventarioPermissions('INVENTARIO_MATERIAL_ENTRY')
  registrarDevolucionesProyecto(
    @Body() dto: RegistrarSalidaMaterialesProyectoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.registrarDevolucionesProyecto(dto, user.sub);
  }
}
