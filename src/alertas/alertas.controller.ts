import {
  Body,
  Controller,
  Delete,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AlertasService } from './alertas.service';
import { AlertasPermission } from './alertas-permission.decorator';
import { AlertasPermissionsGuard } from './alertas-permissions.guard';
import { CrearConfiguracionAlertaDto } from './dto/crear-configuracion-alerta.dto';
import { ActualizarConfiguracionAlertaDto } from './dto/actualizar-configuracion-alerta.dto';
import { CrearNotificacionAlertaDto } from './dto/crear-notificacion-alerta.dto';

type UsuarioRequest = { user: { sub: number } };

@Controller('alertas')
@UseGuards(AlertasPermissionsGuard)
export class AlertasController {
  constructor(private readonly alertas: AlertasService) {}

  @Get('proyectos-disponibles')
  @AlertasPermission('ALERTA_CREATE')
  proyectosDisponibles(@Req() req: UsuarioRequest) {
    return this.alertas.proyectosDisponibles(req.user.sub);
  }

  @Post('notificaciones')
  @AlertasPermission('ALERTA_CREATE')
  crearNotificacion(
    @Body() dto: CrearNotificacionAlertaDto,
    @Req() req: UsuarioRequest,
  ) {
    return this.alertas.crearNotificacion(dto, req.user.sub);
  }

  @Post('configuraciones')
  @AlertasPermission('ALERTA_CONFIGURE')
  crear(@Body() dto: CrearConfiguracionAlertaDto, @Req() req: UsuarioRequest) {
    return this.alertas.crear(dto, req.user.sub);
  }

  @Get('configuraciones')
  @AlertasPermission('ALERTA_CONFIGURE')
  listarConfiguraciones() {
    return this.alertas.listarConfiguraciones();
  }

  @Get('configuraciones/:id/historial')
  @AlertasPermission('ALERTA_CONFIGURE')
  historial(@Param('id', ParseIntPipe) id: number) {
    return this.alertas.historial(id);
  }

  @Get('configuraciones/:id')
  @AlertasPermission('ALERTA_CONFIGURE')
  detalleConfiguracion(@Param('id', ParseIntPipe) id: number) {
    return this.alertas.detalleConfiguracion(id);
  }

  @Patch('configuraciones/:id')
  @AlertasPermission('ALERTA_CONFIGURE')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarConfiguracionAlertaDto,
    @Req() req: UsuarioRequest,
  ) {
    return this.alertas.actualizar(id, dto, req.user.sub);
  }

  @Delete('configuraciones/:id')
  @AlertasPermission('ALERTA_CONFIGURE')
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: UsuarioRequest) {
    return this.alertas.eliminar(id, req.user.sub);
  }

  @Get('auditoria')
  @AlertasPermission('ALERTA_CONFIGURE')
  listarAuditoria() {
    return this.alertas.listarAuditoria();
  }

  @Get('notificaciones/no-leidas')
  @AlertasPermission('ALERTA_READ')
  contarNoLeidas(@Req() req: UsuarioRequest) {
    return this.alertas.contarNoLeidas(req.user.sub);
  }

  @Get('notificaciones')
  @AlertasPermission('ALERTA_READ')
  listarNotificaciones(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Req() req: UsuarioRequest,
  ) {
    return this.alertas.listarNotificaciones(req.user.sub, page, pageSize);
  }

  @Get('notificaciones/:id')
  @AlertasPermission('ALERTA_READ')
  detalleNotificacion(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: UsuarioRequest,
  ) {
    return this.alertas.detalleNotificacion(id, req.user.sub);
  }

  @Patch('notificaciones/:id/visualizar')
  @AlertasPermission('ALERTA_READ')
  visualizar(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: UsuarioRequest,
  ) {
    return this.alertas.visualizar(id, req.user.sub);
  }

  @Patch('notificaciones/:id/atender')
  @AlertasPermission('ALERTA_UPDATE')
  atender(@Param('id', ParseIntPipe) id: number, @Req() req: UsuarioRequest) {
    return this.alertas.atender(id, req.user.sub);
  }
}
