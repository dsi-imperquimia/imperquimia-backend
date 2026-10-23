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
import { SaveMarcaHerramientaDto } from '../dto/save-marca-herramienta.dto';
import { MarcasHerramientaService } from '../service/marcas-herramienta.service';
import {
  CatalogPermissions,
  CatalogPermissionsGuard,
} from '../guards/catalog-permissions.guard';

@Controller('marcas-herramientas')
@UseGuards(CatalogPermissionsGuard)
export class MarcasHerramientaController {
  constructor(private readonly marcas: MarcasHerramientaService) {}

  @Get()
  @CatalogPermissions(
    'HERRAMIENTA_READ',
    'HERRAMIENTA_CREATE',
    'HERRAMIENTA_UPDATE',
  )
  list(@Query('soloActivas') soloActivas?: string) {
    return this.marcas.list(soloActivas === 'true');
  }

  @Post()
  @CatalogPermissions('HERRAMIENTA_CREATE')
  create(@Body() dto: SaveMarcaHerramientaDto) {
    return this.marcas.create(dto.nombre);
  }

  @Patch(':id')
  @CatalogPermissions('HERRAMIENTA_UPDATE')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveMarcaHerramientaDto,
  ) {
    return this.marcas.update(id, dto.nombre);
  }

  @Patch(':id/desactivar')
  @CatalogPermissions('HERRAMIENTA_UPDATE')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.marcas.setActive(id, false);
  }

  @Patch(':id/activar')
  @CatalogPermissions('HERRAMIENTA_UPDATE')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.marcas.setActive(id, true);
  }
}
