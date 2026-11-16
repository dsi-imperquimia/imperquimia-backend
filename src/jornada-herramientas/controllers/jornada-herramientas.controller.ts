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
import { VerificarItemRetornoDto } from '../dto/verificar-item-retorno.dto';
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

  @Get('proyectos-disponibles')
  @JornadaHerramientasPermissions(...LECTURA)
  proyectosDisponibles(@CurrentUser() user: JwtPayload) {
    return this.service.findProyectosDisponibles(user.sub);
  }

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

  @Patch(':id/items/:itemId/retorno')
  @JornadaHerramientasPermissions('JORNADA_HERRAMIENTA_VERIFY')
  verificarItemRetorno(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: VerificarItemRetornoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.verificarItemRetorno(id, itemId, dto, user.sub);
  }

  @Patch(':id/confirmar-retorno')
  @JornadaHerramientasPermissions('JORNADA_HERRAMIENTA_VERIFY')
  confirmarRetorno(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.confirmarRetorno(id, user.sub);
  }
}
