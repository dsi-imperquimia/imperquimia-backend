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
import { TiposHerramientaService } from '../service/tipos-herramienta.service';
import { SaveTipoHerramientaDto } from '../dto/save-tipo-herramienta.dto';
import {
  CatalogPermissions,
  CatalogPermissionsGuard,
} from '../guards/catalog-permissions.guard';

@Controller('tipos-herramienta')
@UseGuards(CatalogPermissionsGuard)
export class TiposHerramientaController {
  constructor(private readonly tipos: TiposHerramientaService) {}

  @Get()
  @CatalogPermissions(
    'HERRAMIENTA_READ',
    'HERRAMIENTA_CREATE',
    'HERRAMIENTA_UPDATE',
  )
  list(@Query('soloActivos') soloActivos?: string) {
    return this.tipos.list(soloActivos === 'true');
  }

  @Post()
  @CatalogPermissions('HERRAMIENTA_CREATE')
  create(@Body() dto: SaveTipoHerramientaDto) {
    return this.tipos.create(dto.nombre);
  }

  @Patch(':id')
  @CatalogPermissions('HERRAMIENTA_UPDATE')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveTipoHerramientaDto,
  ) {
    return this.tipos.update(id, dto.nombre);
  }

  @Patch(':id/desactivar')
  @CatalogPermissions('HERRAMIENTA_UPDATE')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.tipos.setActive(id, false);
  }

  @Patch(':id/activar')
  @CatalogPermissions('HERRAMIENTA_UPDATE')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.tipos.setActive(id, true);
  }
}
