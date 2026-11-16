import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { CreateEmpleadoDto } from '../dto/createEmpleado';
import { UpdateEmpleadoDto } from '../dto/updateEmpleado';
import { UpdateHabilidadesEmpleadoDto } from '../dto/updateHabilidadesEmpleado';
import { EmpleadoService } from '../service/empleado.service';

type UsuarioRequest = { user: { sub: number } };

//estos son los endpoint
// Controlador REST para `empleados`. Rutas sencillas y comentarios en español.
@Controller('empleados')
export class EmpleadoController {
  constructor(private readonly empleadoService: EmpleadoService) {}

  // POST /empleados -> crear un empleado
  @Post()
  create(@Body() createEmpleadoDto: CreateEmpleadoDto) {
    return this.empleadoService.create(createEmpleadoDto);
  }

  // GET /empleados -> listar todos
  @Get()
  findAll() {
    return this.empleadoService.findAll();
  }

  // GET /empleados/asignaciones -> panel de asignaciones y carga por empleado
  @Get('asignaciones')
  findAsignaciones() {
    return this.empleadoService.findAsignaciones();
  }

  // GET /empleados/me/asignaciones -> proyectos activos del técnico autenticado (GPRCIMPER-122)
  @Get('me/asignaciones')
  misAsignaciones(@Req() req: UsuarioRequest) {
    return this.empleadoService.misAsignaciones(req.user.sub);
  }

  // GET /empleados/me/asignaciones/:proyectoId -> detalle de una asignación propia (GPRCIMPER-122)
  @Get('me/asignaciones/:proyectoId')
  miAsignacionDetalle(
    @Param('proyectoId', ParseIntPipe) proyectoId: number,
    @Req() req: UsuarioRequest,
  ) {
    return this.empleadoService.miAsignacionDetalle(req.user.sub, proyectoId);
  }

  // PATCH /empleados/me/asignaciones/:proyectoId/vista -> marca la asignación como vista (GPRCIMPER-122)
  @Patch('me/asignaciones/:proyectoId/vista')
  marcarAsignacionVista(
    @Param('proyectoId', ParseIntPipe) proyectoId: number,
    @Req() req: UsuarioRequest,
  ) {
    return this.empleadoService.marcarAsignacionVista(req.user.sub, proyectoId);
  }

  // GET /empleados/:id -> obtener por id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.empleadoService.findOne(id);
  }

  // PATCH /empleados/:id -> actualizar
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEmpleadoDto: UpdateEmpleadoDto,
  ) {
    return this.empleadoService.update(id, updateEmpleadoDto);
  }

  // DELETE /empleados/:id -> eliminar
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.empleadoService.remove(id);
  }

  @Patch(':id/habilidades')
  updateHabilidades(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateHabilidadesEmpleadoDto,
  ) {
    return this.empleadoService.updateHabilidades(id, body.habilidadesIds);
  }
}
