import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { MovimientoService } from '../service/movimiento.service';
import { CreateMovimientoDto } from '../dto/create-movimiento.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { Request as ExpressRequest } from 'express';
import {
  CatalogPermissions,
  CatalogPermissionsGuard,
} from '@/herramientas/guards/catalog-permissions.guard';

@UseGuards(JwtAuthGuard, CatalogPermissionsGuard)
@Controller('movimientos')
export class MovimientoController {
  //  Verifica que se exporte correctamente aquí
  constructor(private readonly movimientoService: MovimientoService) {}

  // POST /movimientos
  @Post()
  @CatalogPermissions('HERRAMIENTA_UPDATE')
  create(
    @Body() dto: CreateMovimientoDto,
    @Request() req: ExpressRequest & { user: { sub: number } },
  ) {
    return this.movimientoService.create(dto, req.user.sub);
  }

  // GET /movimientos
  @Get()
  @CatalogPermissions('HERRAMIENTA_READ')
  findAll(@Query('herramientaId') herramientaId?: string) {
    const id = herramientaId ? parseInt(herramientaId, 10) : undefined;
    return this.movimientoService.findAll(id);
  }

  // GET /movimientos/:id
  @Get(':id')
  @CatalogPermissions('HERRAMIENTA_READ')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.movimientoService.findOne(id);
  }
}
