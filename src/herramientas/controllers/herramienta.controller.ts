import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HerramientaService } from '../service/herramienta.service';
import { CreateHerramientaDto } from '../dto/create-herramienta.dto';
import { UpdateHerramientaDto } from '../dto/update-herramienta.dto';
import { EstadoHerramienta } from '@gen/prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/decorators/current-user.decorator';
import { CreateReporteDefectoDto } from '../dto/create-reporte-defecto.dto';
import {
  CatalogPermissions,
  CatalogPermissionsGuard,
} from '../guards/catalog-permissions.guard';

@UseGuards(CatalogPermissionsGuard)
@Controller('herramientas')
export class HerramientaController {
  constructor(private readonly herramientaService: HerramientaService) {}

  @Post()
  @CatalogPermissions('HERRAMIENTA_CREATE')
  create(@Body() dto: CreateHerramientaDto) {
    return this.herramientaService.create(dto);
  }

  // GET /herramientas
  // GET /herramientas?proyectoId=3
  // GET /herramientas?estado=DANADA
  @Get()
  @CatalogPermissions('HERRAMIENTA_READ', 'HERRAMIENTA_ASIGNADA_READ')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('proyectoId') proyectoId?: string,
    @Query('estado') estado?: EstadoHerramienta, //  1. Captura el ?estado de la URL
  ) {
    const id = proyectoId ? parseInt(proyectoId, 10) : undefined;
    return this.herramientaService.findAllParaUsuario(user.sub, id, estado);
  }

  @Get(':id')
  @CatalogPermissions('HERRAMIENTA_READ', 'HERRAMIENTA_ASIGNADA_READ')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.herramientaService.findOneParaUsuario(id, user.sub);
  }

  @Get(':id/reportes-defecto')
  @CatalogPermissions('HERRAMIENTA_DEFECTO_READ')
  findReportesDefecto(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.herramientaService.findReportesDefecto(id, user.sub);
  }

  @Post(':id/reportes-defecto')
  @CatalogPermissions('HERRAMIENTA_DEFECTO_CREATE')
  reportarDefecto(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReporteDefectoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.herramientaService.reportarDefecto(id, dto, user.sub);
  }

  @Patch(':id')
  @CatalogPermissions('HERRAMIENTA_UPDATE')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHerramientaDto,
  ) {
    return this.herramientaService.update(id, dto);
  }
}
