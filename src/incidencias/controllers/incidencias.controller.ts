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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActualizarIncidenciaDto } from '../dto/actualizar-incidencia.dto';
import { CambiarEstadoIncidenciaDto } from '../dto/cambiar-estado-incidencia.dto';
import { CrearIncidenciaDto } from '../dto/crear-incidencia.dto';
import { VincularIncidenciasDto } from '../dto/vincular-incidencias.dto';
import {
  IncidenciasPermissions,
  IncidenciasPermissionsGuard,
} from '../guards/incidencias-permissions.guard';
import { IncidenciasService } from '../service/incidencias.service';

const LECTURA = ['INCIDENCIA_READ', 'INCIDENCIA_CREATE', 'INCIDENCIA_UPDATE'];

@UseGuards(IncidenciasPermissionsGuard)
@Controller()
export class IncidenciasController {
  constructor(private readonly service: IncidenciasService) {}

  @Get('incidencias/proyectos-disponibles')
  @IncidenciasPermissions(...LECTURA)
  proyectosDisponibles(@CurrentUser() user: JwtPayload) {
    return this.service.findProyectosDisponibles(user.sub);
  }

  @Get('incidencias')
  @IncidenciasPermissions(...LECTURA)
  findAll(
    @Query('proyectoId', new ParseIntPipe({ optional: true }))
    proyectoId: number | undefined,
    @Query('estado') estado: string | undefined,
    @Query('prioridad') prioridad: string | undefined,
    @Query('actividadDiariaId', new ParseIntPipe({ optional: true }))
    actividadDiariaId: number | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findAll(user.sub, {
      proyectoId,
      estado,
      prioridad,
      actividadDiariaId,
    });
  }

  @Get('incidencias/:id')
  @IncidenciasPermissions(...LECTURA)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user.sub);
  }

  @Post('incidencias')
  @IncidenciasPermissions('INCIDENCIA_CREATE')
  registrar(@Body() dto: CrearIncidenciaDto, @CurrentUser() user: JwtPayload) {
    return this.service.registrar(dto, user.sub);
  }

  @Patch('incidencias/:id')
  @IncidenciasPermissions('INCIDENCIA_UPDATE')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarIncidenciaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.actualizar(id, dto, user.sub);
  }

  @Patch('incidencias/:id/estado')
  @IncidenciasPermissions('INCIDENCIA_UPDATE')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoIncidenciaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.cambiarEstado(id, dto, user.sub);
  }

  /** GPRCIMPER-142: incidencias vinculadas a un reporte de jornada. */
  @Get('actividades-diarias/:actividadId/incidencias')
  @IncidenciasPermissions(...LECTURA)
  porJornada(
    @Param('actividadId', ParseIntPipe) actividadId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findPorJornada(actividadId, user.sub);
  }

  @Put('actividades-diarias/:actividadId/incidencias')
  @IncidenciasPermissions('INCIDENCIA_UPDATE')
  vincular(
    @Param('actividadId', ParseIntPipe) actividadId: number,
    @Body() dto: VincularIncidenciasDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.vincularAJornada(
      actividadId,
      dto.incidenciaIds,
      user.sub,
    );
  }
}
