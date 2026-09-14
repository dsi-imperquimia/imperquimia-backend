import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Req,
} from '@nestjs/common';
import { ProyectoService } from '../service/proyecto.service';
import { CreateProyectoDto } from '../dto/create-proyecto.dto';
import { UpdateProyectoDto } from '../dto/update-proyecto.dto';

@Controller('proyectos')
export class ProyectoController {
  constructor(private readonly proyectoService: ProyectoService) {}

  // POST /proyectos
  @Post()
  create(@Body() dto: CreateProyectoDto, @Req() req: { user: { sub: number } }) {
    return this.proyectoService.create(dto, req.user.sub);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProyectoDto) {
    return this.proyectoService.update(id, dto);
  }

  // GET /proyectos
  @Post(':id/empleados/:empleadoId')
  asignarEmpleado(@Param('id', ParseIntPipe) id: number, @Param('empleadoId', ParseIntPipe) empleadoId: number) {
    return this.proyectoService.asignarEmpleado(id, empleadoId);
  }

  @Patch(':id/empleados/:empleadoId/retirar')
  retirarEmpleado(@Param('id', ParseIntPipe) id: number, @Param('empleadoId', ParseIntPipe) empleadoId: number) {
    return this.proyectoService.retirarEmpleado(id, empleadoId);
  }

  @Get()
  findAll() {
    return this.proyectoService.findAll();
  }

  // GET /proyectos/:id  (incluye herramientas asignadas)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.proyectoService.findOne(id);
  }

  // DELETE /proyectos/:id  (soft delete, falla si tiene herramientas)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.proyectoService.remove(id);
  }
}
