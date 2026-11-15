import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/decorators/current-user.decorator';
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
import { AbrirJornadaHerramientasDto } from '../dto/abrir-jornada-herramientas.dto';
import { VerificarItemInicioDto } from '../dto/verificar-item-inicio.dto';
import {
  JornadaHerramientasPermissions,
  JornadaHerramientasPermissionsGuard,
} from '../guards/jornada-herramientas-permissions.guard';
import { JornadaHerramientasService } from '../service/jornada-herramientas.service';

const LECTURA = ['JORNADA_HERRAMIENTA_READ', 'JORNADA_HERRAMIENTA_VERIFY'];

@UseGuards(JornadaHerramientasPermissionsGuard)
@Controller('jornada-herramientas')
export class JornadaHerramientasController {
  constructor(private readonly service: JornadaHerramientasService) {}

  @Post()
  @JornadaHerramientasPermissions('JORNADA_HERRAMIENTA_VERIFY')
  abrir(
    @Body() dto: AbrirJornadaHerramientasDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.abrir(dto, user.sub);
  }

  @Get()
  @JornadaHerramientasPermissions(...LECTURA)
  obtener(
    @Query('proyectoId', ParseIntPipe) proyectoId: number,
    @Query('empleadoId', ParseIntPipe) empleadoId: number,
    @Query('fecha') fecha: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.obtener(proyectoId, empleadoId, fecha, user.sub);
  }

  @Get(':id')
  @JornadaHerramientasPermissions(...LECTURA)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user.sub);
  }

  @Patch(':id/items/:itemId/inicio')
  @JornadaHerramientasPermissions('JORNADA_HERRAMIENTA_VERIFY')
  verificarItemInicio(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: VerificarItemInicioDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.verificarItemInicio(id, itemId, dto, user.sub);
  }

  @Patch(':id/confirmar-inicio')
  @JornadaHerramientasPermissions('JORNADA_HERRAMIENTA_VERIFY')
  confirmarInicio(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.confirmarInicio(id, user.sub);
  }
}
