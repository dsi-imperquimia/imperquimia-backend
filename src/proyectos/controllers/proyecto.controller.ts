import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ProyectoService } from '../service/proyecto.service';
import { CreateProyectoDto } from '../dto/create-proyecto.dto';

@Controller('proyectos')
export class ProyectoController {
  constructor(private readonly proyectoService: ProyectoService) {}

  // POST /proyectos
  @Post()
  create(@Body() dto: CreateProyectoDto) {
    return this.proyectoService.create(dto);
  }

  // GET /proyectos
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