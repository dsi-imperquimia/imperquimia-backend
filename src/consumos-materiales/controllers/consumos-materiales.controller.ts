import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/decorators/current-user.decorator';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { RegistrarConsumoMaterialDto } from '../dto/registrar-consumo-material.dto';
import { RevertirConsumoMaterialDto } from '../dto/revertir-consumo-material.dto';
import { ReporteConsumosQueryDto } from '../dto/reporte-consumos-query.dto';
import {
  ConsumosPermissions,
  ConsumosPermissionsGuard,
} from '../guards/consumos-permissions.guard';
import { ConsumosMaterialesService } from '../service/consumos-materiales.service';

@Controller('consumos-materiales')
@UseGuards(ConsumosPermissionsGuard)
export class ConsumosMaterialesController {
  constructor(private readonly service: ConsumosMaterialesService) {}

  @Get()
  @ConsumosPermissions('CONSUMO_MATERIAL_READ')
  findProyecto(
    @Query('proyectoId', ParseIntPipe) proyectoId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findProyecto(proyectoId, user.sub);
  }

  @Get('desviaciones')
  @ConsumosPermissions('CONSUMO_DESVIACION_READ')
  findDesviaciones(
    @Query('proyectoId', ParseIntPipe) proyectoId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findDesviaciones(proyectoId, user.sub);
  }

  @Get('proyectos/:id/pdf')
  @ConsumosPermissions('CONSUMO_REPORTE_PDF')
  async generarPdf(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ReporteConsumosQueryDto,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.service.generarReportePdf(id, query, user.sub);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    return new StreamableFile(result.buffer);
  }

  @Post()
  @ConsumosPermissions('CONSUMO_MATERIAL_CREATE')
  registrar(
    @Body() dto: RegistrarConsumoMaterialDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.registrar(dto, user.sub);
  }

  @Post(':id/reverso')
  @ConsumosPermissions('CONSUMO_MATERIAL_CREATE')
  revertir(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RevertirConsumoMaterialDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.revertir(id, dto, user.sub);
  }

  @Post('proyectos/:id/finalizar')
  @ConsumosPermissions('CONSUMO_MATERIAL_CREATE', 'PROYECTO_UPDATE')
  finalizarProyecto(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.finalizarProyecto(id, user.sub);
  }
}
